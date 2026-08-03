import 'dart:async';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../models/vpn_profile.dart';

/// Runs the bundled, native Windows host. It never builds a shell command from
/// profile input: config data is placed in a private file and all process
/// arguments are passed as a list.
class VpnEngine {
  Process? _host;
  File? _temporaryConfig;
  final _events = StreamController<String>.broadcast();
  Stream<String> get events => _events.stream;

  Future<void> connect(VpnProfile profile) async {
    if (!Platform.isWindows) {
      throw UnsupportedError('Системный VPN-туннель в этой сборке доступен только в Windows.');
    }
    await disconnect();
    final support = await getApplicationSupportDirectory();
    final configDir = Directory('${support.path}${Platform.pathSeparator}runtime');
    await configDir.create(recursive: true);
    _temporaryConfig = File('${configDir.path}${Platform.pathSeparator}${profile.id}.${_extension(profile.protocol)}');
    await _temporaryConfig!.writeAsString(profile.config, flush: true);

    final executable = File('${Platform.resolvedExecutable.substring(0, Platform.resolvedExecutable.lastIndexOf(Platform.pathSeparator))}${Platform.pathSeparator}data${Platform.pathSeparator}bin${Platform.pathSeparator}alfa-vpn-host.exe');
    if (!await executable.exists()) {
      await _cleanup();
      throw StateError('Не найден alfa-vpn-host.exe. Переустановите Alfa VPN.');
    }
    _host = await Process.start(executable.path, [
      '--protocol', profile.protocol.name,
      '--config', _temporaryConfig!.path,
      '--profile-id', profile.id,
    ], mode: ProcessStartMode.detachedWithStdio);
    _host!.stdout.transform(SystemEncoding().decoder).transform(const LineSplitter()).listen(_events.add);
    _host!.stderr.transform(SystemEncoding().decoder).transform(const LineSplitter()).listen((line) => _events.add('error: $line'));
    unawaited(_host!.exitCode.then((code) async {
      _events.add('host-exit:$code');
      _host = null;
      await _cleanup();
    }));
  }

  Future<void> disconnect() async {
    final host = _host;
    if (host != null) {
      host.stdin.writeln('disconnect');
      await host.stdin.close();
      await host.exitCode.timeout(const Duration(seconds: 12), onTimeout: () {
        host.kill(ProcessSignal.sigterm);
        return -1;
      });
      _host = null;
    }
    await _cleanup();
  }

  Future<void> _cleanup() async {
    final file = _temporaryConfig;
    _temporaryConfig = null;
    if (file != null && await file.exists()) await file.delete();
  }

  String _extension(VpnProtocol protocol) => switch (protocol) {
    VpnProtocol.wireGuard => 'conf',
    VpnProtocol.openVpn => 'ovpn',
    _ => 'json',
  };

  Future<void> dispose() async { await disconnect(); await _events.close(); }
}

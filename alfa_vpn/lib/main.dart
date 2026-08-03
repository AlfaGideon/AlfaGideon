import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'models/vpn_profile.dart';
import 'services/config_parser.dart';
import 'services/profile_repository.dart';
import 'services/vpn_engine.dart';

void main() => runApp(const AlfaVpnApp());

class AlfaVpnApp extends StatelessWidget {
  const AlfaVpnApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Alfa VPN', debugShowCheckedModeBanner: false,
    theme: ThemeData(useMaterial3: true, brightness: Brightness.dark, colorSchemeSeed: const Color(0xff3d7eff)),
    home: const HomeScreen(),
  );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _repository = ProfileRepository();
  final _engine = VpnEngine();
  List<VpnProfile> _profiles = [];
  VpnProfile? _selected;
  VpnConnectionState _state = VpnConnectionState.disconnected;
  String? _message;

  @override void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    final profiles = await _repository.load();
    if (mounted) setState(() { _profiles = profiles; _selected = profiles.isEmpty ? null : profiles.first; });
  }
  Future<void> _import() async {
    final choice = await showModalBottomSheet<String>(context: context, builder: (context) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
      ListTile(leading: const Icon(Icons.insert_drive_file_outlined), title: const Text('Импортировать файл'), onTap: () => Navigator.pop(context, 'file')),
      ListTile(leading: const Icon(Icons.content_paste_outlined), title: const Text('Вставить конфиг или ссылку'), onTap: () => Navigator.pop(context, 'paste')),
    ])));
    if (choice == 'file') {
      final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['conf', 'ovpn', 'json', 'txt']);
      if (result?.files.single.path != null) await _addConfig(await File(result!.files.single.path!).readAsString(), result.files.single.name);
    } else if (choice == 'paste' && mounted) {
      final controller = TextEditingController();
      final content = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Импорт конфигурации'), content: TextField(controller: controller, minLines: 5, maxLines: 10, decoration: const InputDecoration(hintText: 'vless://… или содержимое .conf/.ovpn')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена')), FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Импортировать'))]));
      if (content != null && content.trim().isNotEmpty) await _addConfig(content);
    }
  }
  Future<void> _addConfig(String config, [String? fileName]) async {
    final parsed = ConfigParser.parse(config, fileName: fileName);
    final profile = VpnProfile(id: const Uuid().v4(), name: parsed.name, protocol: parsed.protocol, config: config, host: parsed.host, port: parsed.port);
    final profiles = [..._profiles, profile];
    await _repository.saveAll(profiles);
    if (mounted) setState(() { _profiles = profiles; _selected = profile; _message = parsed.protocol == VpnProtocol.unknown ? 'Формат сохранён, но пока не распознан.' : 'Профиль импортирован.'; });
  }
  Future<void> _toggle() async {
    if (_selected == null) return _import();
    try {
      if (_state == VpnConnectionState.connected) {
        setState(() => _state = VpnConnectionState.disconnecting); await _engine.disconnect();
        if (mounted) setState(() => _state = VpnConnectionState.disconnected);
      } else {
        setState(() { _state = VpnConnectionState.connecting; _message = null; }); await _engine.connect(_selected!);
        if (mounted) setState(() { _state = VpnConnectionState.connected; _message = 'Защищённое соединение активно.'; });
      }
    } on Exception catch (error) {
      if (mounted) setState(() { _state = VpnConnectionState.error; _message = 'Не удалось запустить VPN: $error'; });
    }
  }
  Future<void> _remove(VpnProfile profile) async {
    final remaining = _profiles.where((p) => p.id != profile.id).toList(); await _repository.delete(profile, remaining);
    if (mounted) setState(() { _profiles = remaining; _selected = _selected?.id == profile.id ? (remaining.isEmpty ? null : remaining.first) : _selected; });
  }
  @override Widget build(BuildContext context) {
    final connected = _state == VpnConnectionState.connected;
    final busy = _state == VpnConnectionState.connecting || _state == VpnConnectionState.disconnecting;
    return Scaffold(
      appBar: AppBar(title: const Text('Alfa VPN'), actions: [IconButton(onPressed: _import, icon: const Icon(Icons.add_circle_outline), tooltip: 'Импортировать конфиг')]),
      body: Row(children: [
        SizedBox(width: 310, child: Column(children: [
          Padding(padding: const EdgeInsets.all(16), child: FilledButton.icon(onPressed: _import, icon: const Icon(Icons.add), label: const Text('Добавить конфиг'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)))),
          Expanded(child: _profiles.isEmpty ? const Center(child: Text('Нет конфигураций\nИмпортируйте .conf, .ovpn\nили ссылку подключения', textAlign: TextAlign.center)) : ListView(children: _profiles.map((profile) => ListTile(selected: _selected?.id == profile.id, leading: Icon(_protocolIcon(profile.protocol)), title: Text(profile.name, overflow: TextOverflow.ellipsis), subtitle: Text(profile.protocol.name), onTap: () => setState(() => _selected = profile), trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => _remove(profile))).toList())),
        ])),
        const VerticalDivider(width: 1), Expanded(child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 530), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(width: 160, height: 160, decoration: BoxDecoration(shape: BoxShape.circle, color: connected ? Colors.green.withOpacity(.16) : Colors.white.withOpacity(.06), border: Border.all(color: connected ? Colors.green : Colors.white24, width: 3)), child: Icon(connected ? Icons.shield : Icons.shield_outlined, size: 78, color: connected ? Colors.greenAccent : Colors.white70)),
          const SizedBox(height: 28), Text(_stateLabel, style: Theme.of(context).textTheme.headlineMedium), const SizedBox(height: 8), Text(_selected == null ? 'Выберите или импортируйте конфигурацию' : '${_selected!.name} · ${_selected!.protocol.name}', style: Theme.of(context).textTheme.bodyLarge),
          if (_message != null) Padding(padding: const EdgeInsets.only(top: 14), child: Text(_message!, textAlign: TextAlign.center, style: TextStyle(color: _state == VpnConnectionState.error ? Colors.redAccent : Colors.white60))),
          const SizedBox(height: 28), FilledButton.icon(onPressed: busy ? null : _toggle, icon: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(connected ? Icons.power_settings_new : Icons.play_arrow), label: Text(connected ? 'Отключить' : 'Подключиться'), style: FilledButton.styleFrom(minimumSize: const Size(220, 54))),
        ]))))
      ]),
    );
  }
  String get _stateLabel => switch (_state) { VpnConnectionState.connected => 'Подключено', VpnConnectionState.connecting => 'Подключение…', VpnConnectionState.disconnecting => 'Отключение…', VpnConnectionState.error => 'Ошибка подключения', _ => 'Не подключено' };
  IconData _protocolIcon(VpnProtocol p) => switch (p) { VpnProtocol.wireGuard => Icons.security, VpnProtocol.openVpn => Icons.vpn_lock, _ => Icons.hub_outlined };
}

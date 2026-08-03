import 'package:flutter/services.dart';
import '../models/vpn_profile.dart';

/// Boundary between Flutter UI and the privileged desktop host.
/// The Windows host must install/use the selected engine and TUN adapter.
class VpnEngine {
  static const _channel = MethodChannel('ru.alfagideon.alfa_vpn/engine');

  Future<void> connect(VpnProfile profile) => _channel.invokeMethod('connect', {
    'id': profile.id, 'protocol': profile.protocol.name, 'config': profile.config,
  });
  Future<void> disconnect() => _channel.invokeMethod('disconnect');
  Future<Map<Object?, Object?>?> status() => _channel.invokeMethod('status');
}

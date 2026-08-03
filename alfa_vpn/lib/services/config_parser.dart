import '../models/vpn_profile.dart';

class ParsedConfig {
  const ParsedConfig({required this.protocol, required this.name, this.host, this.port});
  final VpnProtocol protocol;
  final String name;
  final String? host;
  final int? port;
}

/// Recognizes common client-share URIs and WireGuard/OpenVPN files.
/// It validates format only; engine-specific validation occurs before connection.
class ConfigParser {
  static ParsedConfig parse(String source, {String? fileName}) {
    final value = source.trim();
    final uri = Uri.tryParse(value);
    if (uri != null && uri.scheme.isNotEmpty && !value.contains('\n')) {
      final protocol = switch (uri.scheme.toLowerCase()) {
        'vless' => VpnProtocol.vless, 'vmess' => VpnProtocol.vmess,
        'trojan' => VpnProtocol.trojan, 'ss' => VpnProtocol.shadowsocks,
        'hysteria2' || 'hy2' => VpnProtocol.hysteria2, 'tuic' => VpnProtocol.tuic,
        'wireguard' || 'wg' => VpnProtocol.wireGuard, _ => VpnProtocol.unknown,
      };
      return ParsedConfig(protocol: protocol, name: uri.fragment.isNotEmpty ? Uri.decodeComponent(uri.fragment) : (uri.host.isEmpty ? protocol.name : uri.host), host: uri.host.isEmpty ? null : uri.host, port: uri.hasPort ? uri.port : null);
    }
    final lower = value.toLowerCase();
    if (lower.contains('[interface]') && lower.contains('[peer]')) {
      return ParsedConfig(protocol: VpnProtocol.wireGuard, name: _safeName(fileName, 'WireGuard'));
    }
    if (lower.contains('client') && (lower.contains('remote ') || lower.contains('<connection>'))) {
      final remote = RegExp(r'^remote\s+([^\s]+)(?:\s+(\d+))?', multiLine: true).firstMatch(value);
      return ParsedConfig(protocol: VpnProtocol.openVpn, name: _safeName(fileName, 'OpenVPN'), host: remote?.group(1), port: int.tryParse(remote?.group(2) ?? ''));
    }
    return ParsedConfig(protocol: VpnProtocol.unknown, name: _safeName(fileName, 'Новый профиль'));
  }

  static String _safeName(String? fileName, String fallback) =>
      (fileName == null || fileName.trim().isEmpty) ? fallback : fileName.replaceFirst(RegExp(r'\.[^.]+$'), '');
}

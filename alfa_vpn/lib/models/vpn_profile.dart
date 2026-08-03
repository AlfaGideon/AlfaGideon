enum VpnProtocol { wireGuard, openVpn, vless, vmess, trojan, shadowsocks, hysteria2, tuic, unknown }

enum VpnConnectionState { disconnected, connecting, connected, disconnecting, error }

class VpnProfile {
  const VpnProfile({
    required this.id,
    required this.name,
    required this.protocol,
    required this.config,
    this.host,
    this.port,
    this.lastUsed,
  });

  final String id;
  final String name;
  final VpnProtocol protocol;
  /// Never serialize this field to unencrypted preferences or logs.
  final String config;
  final String? host;
  final int? port;
  final DateTime? lastUsed;

  VpnProfile copyWith({String? name, DateTime? lastUsed}) => VpnProfile(
    id: id, name: name ?? this.name, protocol: protocol, config: config,
    host: host, port: port, lastUsed: lastUsed ?? this.lastUsed,
  );

  Map<String, Object?> toMetadata() => {
    'id': id, 'name': name, 'protocol': protocol.name, 'host': host,
    'port': port, 'lastUsed': lastUsed?.toIso8601String(),
  };

  factory VpnProfile.fromMetadata(Map<String, dynamic> data, String config) => VpnProfile(
    id: data['id'] as String,
    name: data['name'] as String,
    protocol: VpnProtocol.values.firstWhere((p) => p.name == data['protocol'], orElse: () => VpnProtocol.unknown),
    config: config,
    host: data['host'] as String?, port: data['port'] as int?,
    lastUsed: data['lastUsed'] == null ? null : DateTime.tryParse(data['lastUsed'] as String),
  );
}

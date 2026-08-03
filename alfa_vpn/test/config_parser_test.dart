import 'package:alfa_vpn/models/vpn_profile.dart';
import 'package:alfa_vpn/services/config_parser.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ConfigParser', () {
    test('parses a VLESS share link', () {
      final parsed = ConfigParser.parse('vless://id@example.org:443?security=tls#Amsterdam');
      expect(parsed.protocol, VpnProtocol.vless);
      expect(parsed.host, 'example.org');
      expect(parsed.port, 443);
      expect(parsed.name, 'Amsterdam');
    });
    test('recognizes a WireGuard file', () {
      final parsed = ConfigParser.parse('[Interface]\nPrivateKey = secret\n[Peer]\nPublicKey = key', fileName: 'office.conf');
      expect(parsed.protocol, VpnProtocol.wireGuard);
      expect(parsed.name, 'office');
    });
    test('extracts OpenVPN remote endpoint', () {
      final parsed = ConfigParser.parse('client\nremote vpn.example.net 1194\nproto udp', fileName: 'main.ovpn');
      expect(parsed.protocol, VpnProtocol.openVpn);
      expect(parsed.host, 'vpn.example.net');
      expect(parsed.port, 1194);
    });
  });
}

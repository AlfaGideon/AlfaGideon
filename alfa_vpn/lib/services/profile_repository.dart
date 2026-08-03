import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/vpn_profile.dart';

class ProfileRepository {
  static const _metadataKey = 'profile_metadata_v1';
  static const _secretPrefix = 'profile_config_';
  final FlutterSecureStorage _secure = const FlutterSecureStorage();

  Future<List<VpnProfile>> load() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_metadataKey);
    if (raw == null) return [];
    final metadata = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    final profiles = <VpnProfile>[];
    for (final item in metadata) {
      final id = item['id'] as String;
      final config = await _secure.read(key: '$_secretPrefix$id');
      if (config != null) profiles.add(VpnProfile.fromMetadata(item, config));
    }
    return profiles;
  }

  Future<void> saveAll(List<VpnProfile> profiles) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_metadataKey, jsonEncode(profiles.map((p) => p.toMetadata()).toList()));
    for (final profile in profiles) {
      await _secure.write(key: '$_secretPrefix${profile.id}', value: profile.config);
    }
  }

  Future<void> delete(VpnProfile profile, List<VpnProfile> remaining) async {
    await _secure.delete(key: '$_secretPrefix${profile.id}');
    await saveAll(remaining);
  }
}

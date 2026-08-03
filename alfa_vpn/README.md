# Alfa VPN

Flutter desktop-клиент Alfa VPN: импорт конфигураций, локальный зашифрованный vault и единый интерфейс подключения.

## Что уже реализовано

- desktop UI для Windows/macOS/Linux;
- импорт файлов `.conf`, `.ovpn`, `.json`, `.txt`, а также URI ссылок;
- распознавание WireGuard, OpenVPN, VLESS, VMess, Trojan, Shadowsocks, Hysteria2 и TUIC;
- метаданные профиля в обычном local storage, **секретные конфиги только в защищённом хранилище ОС**;
- `MethodChannel`-граница для привилегированного VPN-host процесса.

## Важно: системный туннель

Кнопка подключения намеренно вызывает нативный host через канал `ru.alfagideon.alfa_vpn/engine`. Сам Flutter не может создавать TUN-интерфейс или менять маршрутизацию Windows: это требует нативного кода, прав пользователя, проверенных engine binaries и подписи установщика.

Для production-реализации host должен запускать только доверенные, поставляемые с приложением бинарники:

| Протоколы | Engine |
|---|---|
| VLESS, VMess, Trojan, Shadowsocks, Hysteria2, TUIC | sing-box |
| WireGuard | официальный WireGuard for Windows / `wireguard.exe` |
| OpenVPN | OpenVPN Connect / community OpenVPN с Wintun |

Нельзя выполнять путь к бинарнику или команды, полученные из импортированного конфига. Конфиг передаётся движку через временный файл с ограниченными ACL или stdin, затем безопасно удаляется. Windows TUN/служба должны быть установлены elevation-процессом; UI работает без постоянных admin-прав.

## Запуск интерфейса

Установите Flutter SDK и выполните:

```bash
cd alfa_vpn
flutter create --platforms=windows,macos,linux .
flutter pub get
flutter run -d windows
```

`flutter create` генерирует стандартные platform runner-файлы, но не должен перетирать `lib/` и `pubspec.yaml`.

## Следующий инженерный этап

1. Нативный Windows plugin: lifecycle sing-box / WireGuard / OpenVPN, статус и traffic stats.
2. Подписанный installer MSIX/NSIS, проверка хешей встроенных engine binaries и updater.
3. Kill switch, DNS leak protection, split tunneling, автоподключение и tray.
4. Интеграционные тесты с тестовым сервером каждого заявленного протокола.

«Все протоколы» технически реализуется через адаптеры: в UI единый профиль, а в host — отдельный `VpnEngineAdapter` для каждого движка. Буквально любой произвольный или закрытый формат нельзя обещать без отдельного движка и лицензии.

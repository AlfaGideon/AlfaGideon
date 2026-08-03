# Контракт Windows VPN host

Flutter вызывает `MethodChannel('ru.alfagideon.alfa_vpn/engine')`. Его Windows-обработчик обязан реализовать:

- `connect`: получает `{id, protocol, config}`; создаёт единственный системный туннель и возвращается только после успешного запуска engine;
- `disconnect`: останавливает активный engine, очищает временные конфиги и восстанавливает маршруты/DNS;
- `status`: возвращает `{state, activeProfileId, bytesIn, bytesOut, error?}`.

## Требования безопасности

1. Engine binaries входят в подписанный installer; перед стартом сверяется pinned SHA-256.
2. Ввод конфигурации не интерполируется в shell command. Использовать `CreateProcessW` с фиксированным application path и массивом аргументов.
3. Временные файлы — в private application directory с ACL только для текущего пользователя; удаление гарантировать при crash/restart.
4. Не писать URL, ключи, UUID, access token или конфиг в журнал. В UI выводить только sanitised error.
5. Для каждой сессии подписаться на завершение дочернего процесса, убрать маршруты и DNS. Одновременно допустима ровно одна VPN-сессия.
6. Privileged installer/service отделён от UI и запрашивает UAC только когда это необходимо для Wintun/TUN.

## Матрица адаптеров

`SingBoxAdapter` компилирует импортированные URI/JSON в временный sing-box JSON и включает TUN inbound. `WireGuardAdapter` подаёт `.conf` в WireGuard service. `OpenVpnAdapter` запускает проверенную OpenVPN integration с Wintun. Каждый adapter обязан реализовать start/stop/status и capability validation до запуска.

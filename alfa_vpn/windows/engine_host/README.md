# Native Windows VPN host

This folder builds `alfa-vpn-host.exe`, a small process deliberately separated from Flutter. It starts exactly one bundled engine and receives only fixed command-line options:

```text
alfa-vpn-host.exe --protocol <protocol> --config <private-file> --profile-id <uuid>
```

`disconnect` is sent on standard input. No URI or user-provided configuration is ever passed through `cmd.exe`, PowerShell or string-interpolated shell commands.

## Build and package

Build on Windows with Visual Studio Build Tools:

```powershell
cmake -S . -B build -A x64
cmake --build build --config Release
```

The installer must ship the result in Flutter's `data/bin/` directory and place **verified, signed** third-party binaries here:

```text
data/bin/alfa-vpn-host.exe
data/bin/engines/sing-box.exe
data/bin/engines/wireguard.exe
data/bin/engines/openvpn.exe
```

Do not commit third-party executable files to this repository. Their versions, licenses and SHA-256 checks must be recorded in the release pipeline. Installing a WireGuard tunnel service requires UAC elevation; production packaging must use a narrowly scoped privileged broker rather than run the entire UI elevated.

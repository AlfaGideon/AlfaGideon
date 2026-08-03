// Alfa VPN privileged engine host for Windows.
// It deliberately accepts a file path, never configuration text or shell input.
#include <windows.h>
#include <string>
#include <vector>
#include <iostream>
#include <thread>
#include <atomic>

namespace {
std::atomic_bool stopping = false;
HANDLE child = nullptr;

std::wstring quote(const std::wstring& value) {
  return L"\"" + value + L"\""; // paths are supplied to CreateProcessW directly
}

std::wstring executableDirectory() {
  wchar_t path[MAX_PATH];
  const DWORD length = GetModuleFileNameW(nullptr, path, MAX_PATH);
  std::wstring result(path, length);
  return result.substr(0, result.find_last_of(L"\\/"));
}

bool startChild(const std::wstring& app, const std::wstring& arguments) {
  STARTUPINFOW startup{};
  startup.cb = sizeof(startup);
  PROCESS_INFORMATION process{};
  // CreateProcess may mutate the command-line buffer.
  std::vector<wchar_t> command(arguments.begin(), arguments.end());
  command.push_back(L'\0');
  if (!CreateProcessW(app.c_str(), command.data(), nullptr, nullptr, FALSE,
      CREATE_NO_WINDOW, nullptr, nullptr, &startup, &process)) {
    std::wcerr << L"CreateProcess failed: " << GetLastError() << std::endl;
    return false;
  }
  CloseHandle(process.hThread);
  child = process.hProcess;
  return true;
}

void stopChild() {
  stopping = true;
  if (child != nullptr) {
    TerminateProcess(child, 0);
    WaitForSingleObject(child, 5000);
    CloseHandle(child);
    child = nullptr;
  }
}

std::wstring argument(int argc, wchar_t** argv, const std::wstring& name) {
  for (int i = 1; i + 1 < argc; ++i) if (name == argv[i]) return argv[i + 1];
  return L"";
}

int waitForDisconnect() {
  std::string line;
  while (std::getline(std::cin, line)) if (line == "disconnect") return 0;
  return 0;
}

int run(const std::wstring& protocol, const std::wstring& config, const std::wstring& profileId) {
  if (protocol.empty() || config.empty() || profileId.empty() || GetFileAttributesW(config.c_str()) == INVALID_FILE_ATTRIBUTES) {
    std::wcerr << L"Invalid host arguments" << std::endl;
    return 2;
  }
  const std::wstring bin = executableDirectory() + L"\\engines\\";
  const bool wireguard = protocol == L"wireGuard";
  const bool openvpn = protocol == L"openVpn";
  std::wstring app;
  std::wstring args;
  if (wireguard) {
    app = bin + L"wireguard.exe";
    args = quote(app) + L" /installtunnelservice " + quote(config);
  } else if (openvpn) {
    app = bin + L"openvpn.exe";
    args = quote(app) + L" --config " + quote(config) + L" --verb 3";
  } else {
    app = bin + L"sing-box.exe";
    args = quote(app) + L" run -c " + quote(config);
  }
  if (GetFileAttributesW(app.c_str()) == INVALID_FILE_ATTRIBUTES) {
    std::wcerr << L"Required VPN engine is missing" << std::endl;
    return 3;
  }
  if (!startChild(app, args)) return 4;

  if (wireguard) {
    // wireguard.exe exits after it has created the named tunnel service; the
    // service, unlike this launcher, owns the actual system tunnel.
    WaitForSingleObject(child, INFINITE);
    CloseHandle(child);
    child = nullptr;
    std::wcout << L"connected" << std::endl;
    waitForDisconnect();
    const std::wstring uninstall = quote(app) + L" /uninstalltunnelservice " + quote(profileId);
    if (!startChild(app, uninstall)) return 5;
    WaitForSingleObject(child, INFINITE);
    CloseHandle(child);
    child = nullptr;
    return 0;
  }

  std::wcout << L"connected" << std::endl;
  std::thread console([] { waitForDisconnect(); stopChild(); });
  const DWORD code = WaitForSingleObject(child, INFINITE);
  if (child != nullptr) { CloseHandle(child); child = nullptr; }
  if (console.joinable()) console.detach();
  return code == WAIT_OBJECT_0 ? 0 : 5;
}
}

int wmain(int argc, wchar_t** argv) {
  return run(argument(argc, argv, L"--protocol"), argument(argc, argv, L"--config"), argument(argc, argv, L"--profile-id"));
}

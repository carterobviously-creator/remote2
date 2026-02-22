# ispwin OS (static demo)

Drop this into a GitHub Pages-enabled branch (main / gh-pages). Visit index.html to run the OS. Open remote2.html in a second tab to send remote commands.

Example remote commands:
- openApp (param: explorer | editor | calculator | settings)
- setTheme (param: dark or light)
- createFile (extra: {"path":"/notes2.txt","content":"Hello"})
- openFile (extra: {"path":"/notes2.txt"})
- closeWindow (param: window id or app id, or leave empty to close last)

Notes:
- Communication uses BroadcastChannel with localStorage fallback.
- File system is stored in localStorage under 'ispwin-files'.

---

Overwrite index.html and add the other files under the specified paths.
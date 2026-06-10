#!/bin/sh

if command -v update-alternatives >/dev/null 2>&1; then
  if [ -L /usr/bin/videor ] &&
    [ "$(readlink /usr/bin/videor)" != "/etc/alternatives/videor" ]; then
    rm -f /usr/bin/videor
  fi
  update-alternatives --install /usr/bin/videor videor /opt/Vidéor/videor 100 ||
    ln -sf /opt/Vidéor/videor /usr/bin/videor
else
  ln -sf /opt/Vidéor/videor /usr/bin/videor
fi

if [ -L /proc/self/ns/user ] &&
  command -v unshare >/dev/null 2>&1 &&
  unshare --user true; then
  chmod 0755 /opt/Vidéor/chrome-sandbox || true
else
  chmod 4755 /opt/Vidéor/chrome-sandbox || true
fi

if command -v update-mime-database >/dev/null 2>&1; then
  update-mime-database /usr/share/mime || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache --force --quiet /usr/share/icons/hicolor || true
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database --quiet /usr/share/applications || true
fi

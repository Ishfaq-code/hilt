export function returnPath(value: string | null) {
  if (!value?.startsWith("/")) {
    return "/home";
  }

  try {
    const target = new URL(value, location.origin);

    if (target.origin !== location.origin) {
      return "/home";
    }

    if (target.pathname === "/account") {
      return "/account";
    }

    return target.pathname + target.search + target.hash;
  } catch {
    return "/home";
  }
}

export function signInUrl(
  next = location.pathname + location.search,
  expired = false,
) {
  const query = new URLSearchParams({ next: returnPath(next) });

  if (expired) {
    query.set("expired", "1");
  }

  return `/account?${query}`;
}

import type { ComponentType } from "react";

import Account from "./routes/Account";
import Administration from "./routes/Administration";
import Apply from "./routes/Apply";
import Club from "./routes/Club";
import Discover from "./routes/Discover";
import Home from "./routes/Home";
import Members from "./routes/Members";
import NotFound from "./routes/NotFound";
import type { PageProps } from "./types";

const pages: Record<string, ComponentType<PageProps>> = {
  "/account": Account,
  "/admin/applications": Administration,
  "/apply": Apply,
  "/discover": Discover,
  "/home": Home,
};

export default function Router(props: PageProps) {
  const path = location.pathname;
  const clubRoute = /^\/clubs\/([^/]+)(\/members)?$/.exec(path);

  if (clubRoute) {
    const Page = clubRoute[2] ? Members : Club;

    return <Page {...props} clubId={clubRoute[1]} />;
  }

  const Page = pages[path] || NotFound;

  return <Page {...props} />;
}

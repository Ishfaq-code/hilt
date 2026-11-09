export type User = {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
};

export type Session = {
  user: User;
  isSiteAdmin: boolean;
};

export type PageProps = {
  session: Session | null;
  expireSession: () => void;
  clubId?: string;
};

export type University = {
  id: string;
  slug: string;
  name: string;
  emailDomains: string[];
};

export type Club = {
  id: string;
  name: string;
  description: string;
  links: string[];
  university: University;
  memberCount: number;
  canManage?: boolean;
};

export type Application = Club & {
  approvalStatus: "pending" | "approved" | "rejected";
  contactEmail: string;
  revision: number;
  reviews: {
    decision: string;
    message: string;
    at: string;
    revision: number;
  }[];
};

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  isAdministrator: boolean;
};

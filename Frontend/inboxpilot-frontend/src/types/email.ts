export interface Email {
  emailId: string;
  timestamp: string;
  body: string;
  fromEmail: string;
  sender: string;
  subject: string;
  toEmail: string;
  triage:
    | "Sales"
    | "Applications"
    | "Spam"
    | "Miscellaneous"
    | "Unsorted"
    | "Offensive"
    | "Flagged"
    | "Partnerships";
  userID: string;
}

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
    | "Job"
    | "Spam"
    | "Other"
    | "Unknown"
    | "Offensive"
    | "Flagged"
    | "Business Opportunity";
  userID: string;
}

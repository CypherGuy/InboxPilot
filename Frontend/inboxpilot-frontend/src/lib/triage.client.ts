export async function updateTriageClient(
  emailId: string,
  timestamp: string,
  newTriage: string
) {
  const token = localStorage.getItem("inboxpilot_auth_token");
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    "https://pupen0cr3i.execute-api.eu-west-1.amazonaws.com/prod/update-triage",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emailId, timestamp, newTriage }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Update triage failed: ${res.status} ${errText}`);
  }

  return res.json();
}

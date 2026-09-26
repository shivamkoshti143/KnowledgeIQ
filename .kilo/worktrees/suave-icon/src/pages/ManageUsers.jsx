import { request } from "../api/client";
import { PageTitle, StatusBadge } from "../components/UI";

export function ManageUsers({ data, onChange }) {
  async function updateUser(user, patch) {
    await request(`/users/${user.id}`, { method: "PUT", body: JSON.stringify(patch) });
    await onChange();
  }

  return (
    <>
      <PageTitle title="Users" subtitle="Manage roles and departments." />
      <div className="table-card">
        {data.users.map((user) => (
          <div className="user-row" key={user.id}>
            <div className="profile-dot">{user.name.slice(0, 1)}</div>
            <div><strong>{user.name}</strong><p>{user.email}</p></div>
            <select value={user.departmentId} onChange={(event) => updateUser(user, { departmentId: event.target.value })}>
              {data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={user.role} onChange={(event) => updateUser(user, { role: event.target.value })}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <StatusBadge status={user.status} />
          </div>
        ))}
      </div>
    </>
  );
}

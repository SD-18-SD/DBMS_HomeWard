import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../utils/format.js';

export default function UsersTable({ users, setUsers }) {
  const { user: me } = useAuth();

  async function changeRole(u, role) {
    try {
      const data = await api(`/users/${u._id}/role`, { method: 'PATCH', body: { role } });
      setUsers((list) => list.map((x) => (x._id === u._id ? data.user : x)));
      toast.success(`${u.name} is now ${role === 'admin' ? 'an admin' : 'a user'}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(u) {
    if (!confirm(`Delete ${u.name}? Their applications and pet listings are deleted, and their fundraisers are closed.`)) return;
    try {
      await api(`/users/${u._id}`, { method: 'DELETE' });
      setUsers((list) => list.filter((x) => x._id !== u._id));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="py-3 pr-4">Name</th>
            <th className="py-3 pr-4">Email</th>
            <th className="py-3 pr-4">Joined</th>
            <th className="py-3 pr-4">Role</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isMe = u._id === me._id;
            return (
              <tr key={u._id} className="border-b border-line">
                <td className="py-3 pr-4 font-bold">{u.name}{isMe && ' (you)'}</td>
                <td className="py-3 pr-4">{u.email}</td>
                <td className="py-3 pr-4">{formatDate(u.createdAt)}</td>
                <td className="py-3 pr-4">
                  <select
                    className="input w-auto py-1.5"
                    value={u.role}
                    disabled={isMe}
                    onChange={(e) => changeRole(u, e.target.value)}
                    aria-label={`Role for ${u.name}`}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-3 text-right">
                  {!isMe && <button onClick={() => remove(u)} className="btn-danger px-3 py-1.5">Delete</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

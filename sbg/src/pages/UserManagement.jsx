import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PublicHeader from '@/components/shared/PublicHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, Mail, Shield, Trash2, Edit, MoreVertical, Filter, Download, Upload, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import UserFormDialog from '@/components/users/UserFormDialog';
import UserActivityDialog from '@/components/users/UserActivityDialog';
import BulkActionsBar from '@/components/users/BulkActionsBar';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [activityUser, setActivityUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.asServiceRole.entities.User.list('-created_date', 1000)
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['visitor_sessions'],
    queryFn: () => base44.entities.VisitorSession.list('-last_visit', 500)
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.asServiceRole.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User updated successfully');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User deleted successfully');
    }
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">Only administrators can access user management.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchSearch = !search || 
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || user.role === roleFilter;
    const matchStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !user.is_suspended) ||
      (statusFilter === 'suspended' && user.is_suspended);
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => !u.is_suspended).length,
    suspended: users.filter(u => u.is_suspended).length
  };

  const handleSelectAll = (checked) => {
    setSelectedUsers(checked ? filteredUsers.map(u => u.id) : []);
  };

  const handleSelectUser = (userId, checked) => {
    setSelectedUsers(prev => 
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const exportUsers = () => {
    const csv = [
      ['Name', 'Email', 'Role', 'Created', 'Last Active'].join(','),
      ...filteredUsers.map(u => [
        u.full_name,
        u.email,
        u.role,
        new Date(u.created_date).toLocaleDateString(),
        u.last_active ? new Date(u.last_active).toLocaleDateString() : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Users exported');
  };

  const getUserActivity = (userEmail) => {
    return sessions.filter(s => s.visitor_email === userEmail);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
            <p className="text-slate-600">Manage users, roles, and permissions</p>
          </div>
          <Button onClick={() => { setEditingUser(null); setShowUserForm(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: stats.total, icon: Shield, color: 'blue' },
            { label: 'Administrators', value: stats.admins, icon: Shield, color: 'purple' },
            { label: 'Active Users', value: stats.active, icon: Shield, color: 'green' },
            { label: 'Suspended', value: stats.suspended, icon: Shield, color: 'red' },
          ].map((stat, idx) => (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 text-${stat.color}-500`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters & Actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportUsers}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button variant="outline" onClick={() => queryClient.invalidateQueries(['users'])}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedUsers.length}
            onClear={() => setSelectedUsers([])}
            onDelete={async () => {
              for (const id of selectedUsers) {
                await deleteUserMutation.mutateAsync(id);
              }
              setSelectedUsers([]);
            }}
          />
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Users ({filteredUsers.length})</span>
              {filteredUsers.length > 0 && (
                <Checkbox
                  checked={selectedUsers.length === filteredUsers.length}
                  onCheckedChange={handleSelectAll}
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-500">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 w-12">
                        <Checkbox
                          checked={selectedUsers.length === filteredUsers.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Joined</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Activity</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(user => {
                      const activity = getUserActivity(user.email);
                      return (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-slate-900">{user.full_name}</div>
                              <div className="text-sm text-slate-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.is_suspended ? 'destructive' : 'outline'} className={user.is_suspended ? '' : 'border-green-500 text-green-700'}>
                              {user.is_suspended ? 'Suspended' : 'Active'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {new Date(user.created_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActivityUser(user)}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              {activity.length} sessions
                            </Button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setShowUserForm(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => updateUserMutation.mutate({
                                      id: user.id,
                                      data: { is_suspended: !user.is_suspended }
                                    })}
                                  >
                                    {user.is_suspended ? 'Activate' : 'Suspend'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateUserMutation.mutate({
                                      id: user.id,
                                      data: { role: user.role === 'admin' ? 'user' : 'admin' }
                                    })}
                                  >
                                    {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm('Delete this user?')) {
                                        deleteUserMutation.mutate(user.id);
                                      }
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showUserForm && (
        <UserFormDialog
          user={editingUser}
          isNew={!editingUser}
          onSave={(data) => {
            if (editingUser) {
              updateUserMutation.mutate({ id: editingUser.id, data });
            }
            setShowUserForm(false);
            setEditingUser(null);
          }}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {activityUser && (
        <UserActivityDialog
          user={activityUser}
          sessions={getUserActivity(activityUser.email)}
          onClose={() => setActivityUser(null)}
        />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';

const DEMO_USERS = {
  'VIP1': { password: 'VIP2', page: 'VIP1Page' },
  'VIP2': { password: 'VIP2Pass', page: 'VIP2Page' },
  'VIP3': { password: 'VIP3Pass', page: 'VIP3Page' },
  'VIP4': { password: 'VIP4Pass', page: 'VIP4Page' },
  'VIP5': { password: 'VIP5Pass', page: 'VIP5Page' }
};

export default function DemoLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    
    const user = DEMO_USERS[username];
    if (user && user.password === password) {
      localStorage.setItem('demo_user', username);
      window.location.href = createPageUrl(user.page);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">VIP Demo Access</CardTitle>
          <p className="text-center text-sm text-slate-600">Enter your credentials</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
              Login
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 font-semibold mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>VIP1 / VIP2</p>
              <p>VIP2 / VIP2Pass</p>
              <p>VIP3 / VIP3Pass</p>
              <p>VIP4 / VIP4Pass</p>
              <p>VIP5 / VIP5Pass</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
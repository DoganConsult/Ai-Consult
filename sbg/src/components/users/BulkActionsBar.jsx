import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Trash2, Mail, UserX, UserCheck } from 'lucide-react';

export default function BulkActionsBar({ selectedCount, onClear, onDelete }) {
  return (
    <Card className="mb-6 bg-emerald-50 border-emerald-200">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-emerald-900">
            {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
          </span>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
          <Button variant="outline" size="sm">
            <UserCheck className="w-4 h-4 mr-2" />
            Activate
          </Button>
          <Button variant="outline" size="sm">
            <UserX className="w-4 h-4 mr-2" />
            Suspend
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
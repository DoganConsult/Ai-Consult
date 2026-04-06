import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ERPSyncButton({ 
  entityType, 
  entityData, 
  onSyncComplete,
  variant = 'outline',
  size = 'sm'
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState(null);

  const syncToERP = async () => {
    setSyncing(true);
    setSyncDirection('to_erp');
    
    try {
      let action, data;
      
      switch (entityType) {
        case 'customer':
          action = 'sync_customer_to_erp';
          data = { customer: entityData };
          break;
        case 'product':
          action = 'sync_product_to_erp';
          data = { product: entityData };
          break;
        case 'quotation':
          action = 'sync_quotation_to_erp';
          data = { inquiry: entityData.inquiry, items: entityData.items };
          break;
        default:
          throw new Error('نوع الكيان غير مدعوم');
      }

      const response = await base44.functions.invoke('erpnextSync', { action, data });
      
      if (response.data?.success) {
        toast.success('تمت المزامنة بنجاح', {
          description: response.data.message
        });
        onSyncComplete?.(response.data);
      } else {
        throw new Error(response.data?.error || 'فشلت المزامنة');
      }
    } catch (error) {
      toast.error('خطأ في المزامنة', {
        description: error.message
      });
    } finally {
      setSyncing(false);
      setSyncDirection(null);
    }
  };

  const syncFromERP = async () => {
    setSyncing(true);
    setSyncDirection('from_erp');
    
    try {
      const erpId = entityData.erp_customer_id || entityData.erp_item_code;
      if (!erpId) {
        throw new Error('لا يوجد معرف ERPNext للمزامنة');
      }

      const action = entityType === 'customer' ? 'sync_customer_from_erp' : 'full_sync';
      const response = await base44.functions.invoke('erpnextSync', {
        action,
        data: { 
          erp_customer_id: erpId,
          entity_type: entityType,
          entity_id: erpId,
          direction: 'from_erp'
        }
      });
      
      if (response.data?.success) {
        toast.success('تم جلب البيانات من ERPNext', {
          description: 'تم تحديث البيانات المحلية'
        });
        onSyncComplete?.(response.data);
      } else {
        throw new Error(response.data?.error || 'فشل جلب البيانات');
      }
    } catch (error) {
      toast.error('خطأ في جلب البيانات', {
        description: error.message
      });
    } finally {
      setSyncing(false);
      setSyncDirection(null);
    }
  };

  const hasERPLink = entityData?.erp_customer_id || entityData?.erp_item_code || entityData?.erp_quotation_id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={syncing}>
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin ml-2" />
          ) : (
            <ArrowUpDown className="w-4 h-4 ml-2" />
          )}
          {syncing ? 'جاري المزامنة...' : 'مزامنة ERPNext'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" dir="rtl">
        <DropdownMenuItem onClick={syncToERP} disabled={syncing}>
          <ArrowUp className="w-4 h-4 ml-2 text-blue-600" />
          {hasERPLink ? 'تحديث في ERPNext' : 'إرسال إلى ERPNext'}
        </DropdownMenuItem>
        
        {hasERPLink && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={syncFromERP} disabled={syncing}>
              <ArrowDown className="w-4 h-4 ml-2 text-emerald-600" />
              جلب من ERPNext
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
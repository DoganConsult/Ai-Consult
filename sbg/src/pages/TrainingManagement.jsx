import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Edit, Trash2, Users, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PublicHeader from '@/components/shared/PublicHeader';
import TrainingFormDialog from '@/components/training/TrainingFormDialog';
import { toast } from 'sonner';

export default function TrainingManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ['trainings'],
    queryFn: () => base44.entities.Training.list('-start_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Training.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('تم حذف التدريب بنجاح');
    }
  });

  const enrollMutation = useMutation({
    mutationFn: ({ id, count }) => base44.entities.Training.update(id, { enrolled_count: count + 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('تم التسجيل بنجاح');
    }
  });

  const filteredTrainings = trainings.filter(t => filter === 'all' || t.status === filter);

  const statusColors = {
    planned: 'bg-slate-100 text-slate-700',
    open: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">إدارة التدريب</h1>
            <p className="text-slate-600 mt-1">برامج التدريب والتطوير</p>
          </div>
          <Button onClick={() => { setEditingTraining(null); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            تدريب جديد
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          {['all', 'open', 'in_progress', 'completed'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              onClick={() => setFilter(status)}
              size="sm"
            >
              {status === 'all' ? 'الكل' :
               status === 'open' ? 'مفتوح' :
               status === 'in_progress' ? 'جاري' : 'مكتمل'}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTrainings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">لا توجد برامج تدريبية</h3>
              <p className="text-slate-500 mb-4">ابدأ بإضافة برنامج تدريبي جديد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainings.map((training, idx) => (
              <motion.div
                key={training.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <GraduationCap className="w-8 h-8 text-emerald-600" />
                      <Badge className={statusColors[training.status]}>
                        {training.status === 'planned' ? 'مخطط' :
                         training.status === 'open' ? 'مفتوح' :
                         training.status === 'in_progress' ? 'جاري' :
                         training.status === 'completed' ? 'مكتمل' : 'ملغي'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{training.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{training.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      {training.instructor && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users className="w-4 h-4" />
                          المدرب: {training.instructor}
                        </div>
                      )}
                      {training.duration_hours && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4" />
                          المدة: {training.duration_hours} ساعة
                        </div>
                      )}
                      {training.start_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(training.start_date).toLocaleDateString('ar-SA')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4 text-sm">
                      <span className="text-slate-600">المسجلين:</span>
                      <span className="font-semibold">
                        {training.enrolled_count || 0} / {training.max_participants || '∞'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {training.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => enrollMutation.mutate({ id: training.id, count: training.enrolled_count || 0 })}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          تسجيل
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingTraining(training); setDialogOpen(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {(user?.role === 'admin' || user?.email === training.created_by) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا التدريب؟')) {
                              deleteMutation.mutate(training.id);
                            }
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <TrainingFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTraining(null); }}
        training={editingTraining}
      />
    </div>
  );
}
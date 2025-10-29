import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';

interface Group {
  id: number;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await apiCall('/groups');
      setGroups(data.groups);
    } catch (error: any) {
      toast.error('Ошибка загрузки групп: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description,
        active: group.active,
      });
    } else {
      setEditingGroup(null);
      setFormData({ name: '', description: '', active: true });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingGroup) {
        await apiCall(`/groups/${editingGroup.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Группа обновлена');
      } else {
        await apiCall('/groups', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Группа создана');
      }
      setDialogOpen(false);
      loadGroups();
    } catch (error: any) {
      toast.error('Ошибка сохранения: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту группу?')) return;

    try {
      await apiCall(`/groups/${id}`, { method: 'DELETE' });
      toast.success('Группа удалена');
      loadGroups();
    } catch (error: any) {
      toast.error('Ошибка удаления: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">Группы товаров</h1>
          <p className="text-gray-600">Управление категориями товаров</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Создать группу
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Создана</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  Нет групп товаров
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.id}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{group.description}</TableCell>
                  <TableCell>
                    <Badge variant={group.active ? 'default' : 'secondary'}>
                      {group.active ? 'Активна' : 'Неактивна'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(group.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(group.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Редактировать группу' : 'Создать группу'}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о группе товаров
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Смартфоны"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание группы"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="active">Активна</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

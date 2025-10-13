'use client';

import { useEffect, useState } from 'react';
import { supabase, Category } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';



export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
  });

  useEffect(() => {
    if (user) {
      loadCategories();
      initializeDefaultCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultCategories = async () => {
    try {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (existing && existing.length > 0) return;

      const defaultCategories = [
        { name: 'Groceries', type: 'expense' },
        { name: 'Transportation', type: 'expense' },
        { name: 'Utilities', type: 'expense' },
        { name: 'Entertainment', type: 'expense' },
        { name: 'Healthcare', type: 'expense' },
        { name: 'Shopping', type: 'expense' },
        { name: 'Salary', type: 'income' },
        { name: 'Freelance', type: 'income' },
        { name: 'Investment', type: 'income' },
      ];

      const categoriesToInsert = defaultCategories.map((cat) => ({
        ...cat,
        user_id: user?.id,
      }));

      await supabase.from('categories').insert(categoriesToInsert);
      loadCategories();
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const categoryData = {
        user_id: user?.id,
        name: formData.name,
        type: formData.type,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase.from('categories').insert([categoryData]);

        if (error) throw error;
        toast.success('Category added successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) throw error;
      toast.success('Category deleted');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'expense',
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Organize your transactions with custom categories
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md sm:max-w-[425px] p-0 flex flex-col max-h-[95vh]">
            <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle className="text-lg sm:text-xl">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingCategory
                  ? 'Update the category details below'
                  : 'Create a new category for organizing transactions'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name" className="text-xs sm:text-sm">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Groceries"
                    required
                    className="text-sm h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="type" className="text-xs sm:text-sm">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'income' | 'expense') =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger className="text-sm h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 bg-slate-50">
                <Button type="submit" className="w-full h-9 sm:h-10 text-sm">
                  {editingCategory ? 'Update' : 'Add'} Category
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto h-9 sm:h-10 text-sm"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <p className="text-slate-600 text-center py-8 text-sm">
                No expense categories yet. Add your first one!
              </p>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between border border-slate-200 rounded-lg p-3 hover:border-red-300 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                          {category.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs text-red-600 border-red-200"
                        >
                          Expense
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <ConfirmDialog
                        title="Are you sure?"
                        description="This action will permanently remove the selected data from the system. Please confirm to continue."
                        onConfirm={() => handleDelete(transaction)}
                        confirmText="Delete"
                        isDestructive={true} // This will apply the red style to the delete button
                      >
                        {/* This is the trigger element (children) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-10 sm:w-10"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Income Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <p className="text-slate-600 text-center py-8 text-sm">
                No income categories yet. Add your first one!
              </p>
            ) : (
              <div className="space-y-2">
                {incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between border border-slate-200 rounded-lg p-3 hover:border-green-300 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                          {category.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs text-green-600 border-green-200"
                        >
                          Income
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <ConfirmDialog
                        title="Are you sure?"
                        description="This action will permanently remove the selected data from the system. Please confirm to continue."
                        onConfirm={() => handleDelete(category.id)}
                        confirmText="Delete"
                        isDestructive={true} // This will apply the red style to the delete button
                      >
                        {/* This is the trigger element (children) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-10 sm:w-10"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
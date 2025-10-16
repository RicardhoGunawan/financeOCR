'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUpRight, ArrowDownRight, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type TransactionWithWallet = {
  id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category_id?: number;
  note?: string;
  wallet_id?: number;
  source: string;
  category?: {
    id: number;
    name: string;
    type: string;
  };
  wallet?: {
    id: number;
    name: string;
    color: string;
  };
};

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const createColumns = (
  onEdit: (transaction: TransactionWithWallet) => void,
  onDelete: (transaction: TransactionWithWallet) => void
): ColumnDef<TransactionWithWallet>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string;
      return (
        <div className="flex items-center gap-2">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center ${
              type === 'income' ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            {type === 'income' ? (
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            )}
          </div>
          <span className="capitalize font-medium">{type}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div className="font-semibold">{row.getValue('title')}</div>;
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full justify-end"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const type = row.original.type;
      return (
        <div
          className={`text-right font-bold ${
            type === 'income' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {type === 'income' ? '+' : '-'}
          {formatRupiah(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('date'));
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.original.category;
      return category ? (
        <Badge variant="secondary">{category.name}</Badge>
      ) : (
        <span className="text-slate-400 text-sm">No category</span>
      );
    },
    filterFn: (row, id, value) => {
      return row.original.category?.name === value;
    },
  },
  {
    accessorKey: 'wallet',
    header: 'Wallet',
    cell: ({ row }) => {
      const wallet = row.original.wallet;
      return wallet ? (
        <Badge
          variant="outline"
          className="gap-1"
          style={{ borderColor: wallet.color }}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: wallet.color }}
          />
          {wallet.name}
        </Badge>
      ) : (
        <span className="text-slate-400 text-sm">No wallet</span>
      );
    },
    filterFn: (row, id, value) => {
      return row.original.wallet?.name === value;
    },
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      return (
        <Badge variant="outline" className="capitalize">
          {row.getValue('source')}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(transaction)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
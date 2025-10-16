'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, FileDown, FileSpreadsheet, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { exportToPDF, exportToExcel } from './export-utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: 'date',
      desc: true,
    },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Get unique categories and wallets for filter options
  const categories = React.useMemo(() => {
    const categorySet = new Set<string>();
    (data as any[]).forEach((item: any) => {
      if (item.category?.name) {
        categorySet.add(item.category.name);
      }
    });
    return Array.from(categorySet).sort();
  }, [data]);

  const wallets = React.useMemo(() => {
    const walletSet = new Set<string>();
    (data as any[]).forEach((item: any) => {
      if (item.wallet?.name) {
        walletSet.add(item.wallet.name);
      }
    });
    return Array.from(walletSet).sort();
  }, [data]);

  const hasActiveFilters = columnFilters.length > 0;

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <div className="w-full">
        <Input
          placeholder="Search transactions..."
          value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('title')?.setFilterValue(event.target.value)
          }
          className="w-full"
        />
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <span className="text-xs">Type: </span>
                <span className="font-semibold text-xs ml-1">
                  {table.getColumn('type')?.getFilterValue() === 'income'
                    ? 'Income'
                    : table.getColumn('type')?.getFilterValue() === 'expense'
                    ? 'Expense'
                    : 'All'}
                </span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem
                checked={!table.getColumn('type')?.getFilterValue()}
                onCheckedChange={() =>
                  table.getColumn('type')?.setFilterValue(undefined)
                }
              >
                All Types
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={table.getColumn('type')?.getFilterValue() === 'income'}
                onCheckedChange={(checked) =>
                  table.getColumn('type')?.setFilterValue(checked ? 'income' : undefined)
                }
              >
                Income Only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={table.getColumn('type')?.getFilterValue() === 'expense'}
                onCheckedChange={(checked) =>
                  table.getColumn('type')?.setFilterValue(checked ? 'expense' : undefined)
                }
              >
                Expense Only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Category Filter */}
          {categories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <span className="text-xs">Category: </span>
                  <span className="font-semibold text-xs ml-1 max-w-[80px] truncate">
                    {(table.getColumn('category')?.getFilterValue() as string) || 'All'}
                  </span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={!table.getColumn('category')?.getFilterValue()}
                  onCheckedChange={() =>
                    table.getColumn('category')?.setFilterValue(undefined)
                  }
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                {categories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={table.getColumn('category')?.getFilterValue() === category}
                    onCheckedChange={(checked) =>
                      table.getColumn('category')?.setFilterValue(checked ? category : undefined)
                    }
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Wallet Filter */}
          {wallets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <span className="text-xs">Wallet: </span>
                  <span className="font-semibold text-xs ml-1 max-w-[80px] truncate">
                    {(table.getColumn('wallet')?.getFilterValue() as string) || 'All'}
                  </span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={!table.getColumn('wallet')?.getFilterValue()}
                  onCheckedChange={() =>
                    table.getColumn('wallet')?.setFilterValue(undefined)
                  }
                >
                  All Wallets
                </DropdownMenuCheckboxItem>
                {wallets.map((wallet) => (
                  <DropdownMenuCheckboxItem
                    key={wallet}
                    checked={table.getColumn('wallet')?.getFilterValue() === wallet}
                    onCheckedChange={(checked) =>
                      table.getColumn('wallet')?.setFilterValue(checked ? wallet : undefined)
                    }
                  >
                    {wallet}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
              className="h-9 gap-1"
            >
              <span className="text-xs">Clear</span>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Export and Column Visibility */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                onClick={() => exportToPDF(data as any)}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                onClick={() => exportToExcel(data as any)}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Columns <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
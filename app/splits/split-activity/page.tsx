'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Item } from '@/lib/types';
import { Split, ArrowRight, Clock } from 'lucide-react';
import {
  formatNumberWithCommas,
  toastErrors,
  toastSuccess,
  sessionStore,
  alphaNumericDate,
} from '@/helpers/formatStrings';
import { useAuth } from '@/lib/auth-context';
import axiosInstance from '@/lib/customAxios';
import { useToaster } from '@/components/util/CustomToast';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { CustomSelect } from '@/components/util/CustomSelect';

// ---- GET /Split/Transaction ----
interface ItemSplitTransaction {
  id: string;
  itemSplitSetupId: string;
  sourceItemId: string;
  sourceItemName: string;
  targetItemId: string;
  targetItemName: string;
  sourceQuantity: number;
  targetQuantity: number;
  targetQuantitySnapShot: number | null | undefined;
  createdById: string;
  createdAt: string;
}

interface ItemSplitTransactionRow extends ItemSplitTransaction {
  _search: string;
}

// ✅ Safe number formatter — handles undefined/null/NaN/strings.
const safeNumber = (value: unknown): string => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '0';
  return formatNumberWithCommas(n.toString());
};

export default function ItemSplitActivityPage() {
  const sessionShop = sessionStore.get('selectedShop');
  const { user, selectedShop } = useAuth();
  const toast = useToaster();

  // ✅ Location comes from context/session, not from a dropdown
  const locationId = selectedShop || sessionShop || '';

  const [transactions, setTransactions] = useState<ItemSplitTransaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ---- Modal form state (only source + target) ----
  const [sourceItemId, setSourceItemId] = useState('');
  const [targetItemId, setTargetItemId] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      const data = await axiosInstance.get('/Split/Transaction');
      setTransactions(data?.data ?? []);
    } catch (error) {
      console.error('Error loading split transactions:', error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await axiosInstance.get(
        `/items/Admin-View?LocationId=${selectedShop || sessionShop}`
      );
      setItems(data?.data ?? []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedShop, sessionShop]);

  useEffect(() => {
    loadTransactions();
    loadItems();
  }, [user?.companyId, selectedShop, loadTransactions, loadItems]);

  const resetForm = () => {
    setSourceItemId('');
    setTargetItemId('');
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // ---- Dropdown options (same filtering behavior as before) ----
  const sourceItemOptions = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => a.name?.trim().localeCompare(b.name?.trim()))
        .map((x) => ({ value: x.id, label: `${x.name} (${x.code})` })),
    [items]
  );

  const targetItemOptions = useMemo(
    () =>
      items
        .filter((x) => x.id !== sourceItemId)
        .slice()
        .sort((a, b) => a.name?.trim().localeCompare(b.name?.trim()))
        .map((x) => ({ value: x.id, label: `${x.name} (${x.code})` })),
    [items, sourceItemId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceItemId) {
      toast.warning({ title: 'Select a source item', description: '' });
      return;
    }
    if (!targetItemId) {
      toast.warning({ title: 'Select a target item', description: '' });
      return;
    }
    if (sourceItemId === targetItemId) {
      toast.warning({ title: 'Source and target items must be different', description: '' });
      return;
    }
    if (!locationId) {
      toast.warning({ title: 'No location selected', description: 'Select a shop from the header first.' });
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post('/Split/Transaction', {
        sourceItemId,
        targetItemId,
        locationId,
      });
      closeModal();
      toastSuccess(toast, 'Split recorded successfully');
      await loadTransactions();
    } catch (error: any) {
      console.error('Error recording split:', error?.response);
      toastErrors(toast, error, '');
    } finally {
      setIsLoading(false);
    }
  };

  const tableData: ItemSplitTransactionRow[] = useMemo(
    () =>
      transactions.map((t) => ({
        ...t,
        _search: `${t.sourceItemName ?? ''} ${t.targetItemName ?? ''}`.toLowerCase(),
      })),
    [transactions]
  );

  const columns = [
    {
      key: 'sourceItemName' as keyof ItemSplitTransactionRow,
      label: 'Source Item',
      sortable: true,
      render: (t: ItemSplitTransactionRow) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Split className="w-4 h-4 text-primary" />
          </div>
          <p className="font-medium text-foreground text-sm truncate">
            {t.sourceItemName ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'sourceQuantity' as keyof ItemSplitTransactionRow,
      label: 'Source Qty',
      sortable: true,
      render: (t: ItemSplitTransactionRow) => (
        <span className="text-foreground font-medium">
          {safeNumber(t.sourceQuantity)}
        </span>
      ),
    },
    {
      key: 'arrow' as keyof ItemSplitTransactionRow,
      label: '',
      render: () => (
        <div className="flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      ),
    },
    {
      key: 'targetItemName' as keyof ItemSplitTransactionRow,
      label: 'Target Item',
      sortable: true,
      render: (t: ItemSplitTransactionRow) => (
        <p className="font-medium text-foreground text-sm truncate">
          {t.targetItemName ?? '—'}
        </p>
      ),
    },
    {
      key: 'targetQuantity' as keyof ItemSplitTransactionRow,
      label: 'Target Qty',
      sortable: true,
      render: (t: ItemSplitTransactionRow) => (
        <span className="text-foreground font-medium">
          {safeNumber(t.targetQuantity)}
        </span>
      ),
    },
    {
      key: 'targetQuantitySnapShot' as keyof ItemSplitTransactionRow,
      label: 'Snapshot Qty',
      sortable: true,
      render: (t: ItemSplitTransactionRow) => (
        <span className="text-foreground font-medium">
          {safeNumber(t.targetQuantitySnapShot)}
        </span>
      ),
    },
    {
      key: 'createdAt' as keyof ItemSplitTransactionRow,
      label: 'Date',
      sortable: true,
      render: (t: ItemSplitTransactionRow) => (
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          {/* <Clock className="w-3 h-3" /> */}
          <span>{alphaNumericDate(t.createdAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {isLoading && <LoadingOverlay />}
      <Header
        title="Split Activity"
        description="Record and review item split transactions"
      />

      <div className="mt-2">
        <DataTable
          title="Split Activity"
          data={tableData}
          columns={columns}
          searchKey="_search"
          onAdd={openModal}
          addLabel="Record Split"
          emptyMessage="No split activity found."
          height="h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]"
        />
      </div>

      {/* ===================== Record Split Modal ===================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Record Split"
        description="Execute a split — quantities and location are applied from the setup"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Source */}
          <div className="space-y-2">
            <Label className="text-foreground">Source Item *</Label>
            <CustomSelect
              options={sourceItemOptions}
              value={sourceItemId}
              onValueChange={(v) => {
                setSourceItemId(v);
                if (v === targetItemId) setTargetItemId('');
              }}
              placeholder="Select the item to split from"
              required={true}
              searchable={true}
              clearable={true}
              size="md"
            />
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center py-1">
            <div className="h-px flex-1 bg-border" />
            <ArrowRight className="mx-3 w-5 h-5 text-muted-foreground" />
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label className="text-foreground">Target Item *</Label>
            <CustomSelect
              options={targetItemOptions}
              value={targetItemId}
              onValueChange={setTargetItemId}
              placeholder={
                sourceItemId
                  ? 'Select the item to split into'
                  : 'Select a source item first'
              }
              required={true}
              searchable={true}
              clearable={true}
              size="md"
              disabled={!sourceItemId}
            />
            {!sourceItemId && (
              <p className="text-xs text-muted-foreground">
                Choose a source item to enable target selection.
              </p>
            )}
          </div>

          {/* Info note */}
          <div className="p-3 bg-secondary rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              Quantities are applied from the matching split setup.
              Source stock is decremented and target stock is incremented
              at the current shop location.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!locationId}
            >
              <Split className="w-4 h-4 mr-2" />
              Record Split
            </Button>
            <Button type="button" variant="outline" onClick={closeModal}>
              Close
            </Button>
          </div>
        </form>
      </Modal>

      {toast.ToastComponent}
    </div>
  );
}
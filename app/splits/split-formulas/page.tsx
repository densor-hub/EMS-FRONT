'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { Item } from '@/lib/types';
import { Split, ArrowRight } from 'lucide-react';
import {
  formatNumberWithCommas,
  removeCommasFromNumbers,
  toastErrors,
  toastSuccess,
} from '@/helpers/formatStrings';
import { useAuth } from '@/lib/auth-context';
import axiosInstance from '@/lib/customAxios';
import { useToaster } from '@/components/util/CustomToast';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { CustomSelect } from '@/components/util/CustomSelect';
import SweetAlert from '@/components/util/SweetAlert';
import { sessionStore } from '@/helpers/formatStrings';

// ---- Shape returned by GET /Split/SetUp ----
interface ItemSplitSetup {
  id: string;
  sourceItemId: string;
  sourceItemName: string;
  targetItemId: string;
  targetItemName: string;
  sourceQuantity: number;
  targetQuantity: number;
  generalStatus: number; // 1 = Active, 0 = Inactive, -1 = SoftDeleted
}

// Table row with a combined `_search` field for dual-field search
interface ItemSplitSetupRow extends ItemSplitSetup {
  _search: string;
}

const STATUS_ACTIVE = 1;
const STATUS_INACTIVE = 0;

export default function ItemSplitSetupPage() {
  const sessionShop = sessionStore.get("selectedShop");
  const { user, selectedShop } = useAuth();
  const toast = useToaster();

  const [setups, setSetups] = useState<ItemSplitSetup[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Editing an existing setup (null = creating new)
  const [editingSetup, setEditingSetup] = useState<ItemSplitSetup | null>(null);

  // ---- Form state ----
  const [sourceItemId, setSourceItemId] = useState('');
  const [targetItemId, setTargetItemId] = useState('');
  const [sourceQty, setSourceQty] = useState('1');
  const [targetQty, setTargetQty] = useState('');
  const [isSourceQtyEditable, setIsSourceQtyEditable] = useState(false);
  const [statusActive, setStatusActive] = useState(true);

  // Delete confirmation
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    loadSetups();
    loadItems();
  }, [user?.companyId, selectedShop]);

  const loadSetups = async () => {
    try {
      const data = await axiosInstance.get(`/Split/SetUp/${selectedShop || sessionShop}`);
      setSetups(data?.data ?? []);
    } catch (error) {
      console.error('Error loading split setups:', error);
    }
  };

  const loadItems = async () => {
    try {
     if (selectedShop || sessionShop) {
       setIsLoading(true);
      const data = await axiosInstance.get(
        `/items/Admin-View?LocationId=${selectedShop || sessionShop}`
      );
      setItems(data?.data ?? []);
     }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingSetup(null);
    setSourceItemId('');
    setTargetItemId('');
    setSourceQty('1');
    setTargetQty('');
    setIsSourceQtyEditable(false);
    setStatusActive(true);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // ✅ Row clicked → pre-fill the modal for editing
  const openEdit = (setup: ItemSplitSetup) => {
    setEditingSetup(setup);
    setSourceItemId(setup.sourceItemId);
    setTargetItemId(setup.targetItemId);
    setSourceQty(formatNumberWithCommas(setup.sourceQuantity.toString()));
    setTargetQty(formatNumberWithCommas(setup.targetQuantity.toString()));
    // Source qty is read-only in edit mode — backend doesn't allow changing it
    setIsSourceQtyEditable(false);
    setStatusActive(setup.generalStatus === STATUS_ACTIVE);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // ---- Dropdown options (create only) ----
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

  const selectedSource = items.find((x) => x.id === sourceItemId);
  const selectedTarget = items.find((x) => x.id === targetItemId);

  // ---- Submit: Create or Update ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tq = Number(removeCommasFromNumbers(targetQty));
    if (!Number.isFinite(tq) || tq <= 0) {
      toast.warning({ title: 'Target quantity must be greater than 0', description: '' });
      return;
    }

    // ---- UPDATE MODE ----
    if (editingSetup) {
      setIsLoading(true);
      try {
        await axiosInstance.put(`/Split/SetUp/${editingSetup.id}`, {
          targetQuantity: tq,
          generalStatus: statusActive ? STATUS_ACTIVE : STATUS_INACTIVE,
        });
        closeModal();
        toastSuccess(toast, 'Split setup updated successfully');
        await loadSetups();
      } catch (error: any) {
        console.error('Error updating split:', error?.response);
        toastErrors(toast, error, '');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ---- CREATE MODE ----
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

    const sq = Number(removeCommasFromNumbers(sourceQty));
    if (!Number.isFinite(sq) || sq <= 0) {
      toast.warning({ title: 'Source quantity must be greater than 0', description: '' });
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post('/Split/SetUp', {
        sourceItemId,
        targetItemId,
        sourceQuantity: sq,
        targetQuantity: tq,
      });
      closeModal();
      toastSuccess(toast, 'Split setup created successfully');
      await loadSetups();
    } catch (error: any) {
      console.error('Error creating split:', error?.response);
      toastErrors(toast, error, '');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!editingSetup) return;
    setIsLoading(true);
    try {
      await axiosInstance.delete(`/Split/SetUp/${editingSetup.id}`);
      setShowDeleteAlert(false);
      closeModal();
      toast.success({ title: 'Deleted successfully', description: '' });
      await loadSetups();
    } catch (error: any) {
      console.error('Error deleting split:', error?.response);
      toastErrors(toast, error, '');
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = (status: number) => {
    if (status === STATUS_ACTIVE) {
      return <Badge className="bg-success/20 text-success">Active</Badge>;
    }
    if (status === STATUS_INACTIVE) {
      return <Badge className="bg-amber-100 text-amber-700">Inactive</Badge>;
    }
    return <Badge className="bg-red-100 text-red-500">Deleted</Badge>;
  };

  // ✅ Add `_search` for dual-field search
  const tableData: ItemSplitSetupRow[] = useMemo(
    () =>
      setups.map((s) => ({
        ...s,
        _search: `${s.sourceItemName} ${s.targetItemName}`.toLowerCase(),
      })),
    [setups]
  );

  // ---- Table columns ----
  const columns = [
    {
      key: 'sourceItemName' as keyof ItemSplitSetupRow,
      label: 'Source Item',
      sortable: true,
      render: (s: ItemSplitSetupRow) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Split className="w-4 h-4 text-primary" />
          </div>
          <p className="font-medium text-foreground text-sm truncate">
            {s.sourceItemName}
          </p>
        </div>
      ),
    },
    // {
    //   key: 'sourceQuantity' as keyof ItemSplitSetupRow,
    //   label: 'Source Qty',
    //   sortable: true,
    //   render: (s: ItemSplitSetupRow) => (
    //     <span className="text-foreground font-medium">
    //       {formatNumberWithCommas(s.sourceQuantity.toString())}
    //     </span>
    //   ),
    // },
    {
      key: 'arrow' as keyof ItemSplitSetupRow,
      label: '',
      render: () => (
        <div className="flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      ),
    },
    {
      key: 'targetItemName' as keyof ItemSplitSetupRow,
      label: 'Target Item',
      sortable: true,
      render: (s: ItemSplitSetupRow) => (
        <p className="font-medium text-foreground text-sm truncate">
          {s.targetItemName}
        </p>
      ),
    },
    {
      key: 'targetQuantity' as keyof ItemSplitSetupRow,
      label: 'Target Qty',
      sortable: true,
      render: (s: ItemSplitSetupRow) => (
        <span className="text-foreground font-medium">
          {formatNumberWithCommas(s.targetQuantity.toString())}
        </span>
      ),
    },
    {
      key: 'generalStatus' as keyof ItemSplitSetupRow,
      label: 'Status',
      render: (s: ItemSplitSetupRow) => statusBadge(s.generalStatus),
    },
  ];

  const isEditMode = !!editingSetup;

  return (
    <div className="min-h-screen">
      {isLoading && <LoadingOverlay />}
      <Header
        title="Item Split Setup"
        description="Define how items split into other items"
      />

      <div className="mt-2">
        <DataTable
          title="Split Setups"
          data={tableData}
          columns={columns}
          searchKey="_search"
          // searchPlaceholder="Search by source or target item..."
          onAdd={openCreate}
          addLabel="Add Split Setup"
          emptyMessage="No split setups found."
          height="h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]"
          onRowClick={(row: ItemSplitSetupRow) => openEdit(row)}
        />
      </div>

      {/* ===================== Create / Edit Modal ===================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditMode ? 'Edit Split Setup' : 'Add Split Setup'}
        description={
          isEditMode
            ? 'Update the target quantity or status'
            : 'Define a rule for splitting one item into another'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ---- Source Item ---- */}
          <div className="space-y-2">
            <Label className="text-foreground">Source Item *</Label>
            {isEditMode ? (
              // ✅ Read-only display in edit mode
              <div className="flex items-center h-10 px-3 rounded-md border border-border bg-muted text-sm text-foreground">
                {editingSetup?.sourceItemName}
              </div>
            ) : (
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
            )}
          </div>

          <div className="flex items-center justify-center py-1">
            <div className="h-px flex-1 bg-border" />
            <ArrowRight className="mx-3 w-5 h-5 text-muted-foreground" />
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* ---- Target Item ---- */}
          <div className="space-y-2">
            <Label className="text-foreground">Target Item *</Label>
            {isEditMode ? (
              <div className="flex items-center h-10 px-3 rounded-md border border-border bg-muted text-sm text-foreground">
                {editingSetup?.targetItemName}
              </div>
            ) : (
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
            )}
            {!isEditMode && !sourceItemId && (
              <p className="text-xs text-muted-foreground">
                Choose a source item to enable target selection.
              </p>
            )}
          </div>

          {/* ---- Quantities ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Source Quantity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sourceQty" className="text-foreground">
                  Source Quantity *
                </Label>
                {!isEditMode && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Edit</span>
                    <Switch
                      id="sourceQtyEditable"
                      checked={isSourceQtyEditable}
                      onCheckedChange={(checked) => {
                        setIsSourceQtyEditable(checked);
                        if (!checked) setSourceQty('1');
                      }}
                    />
                  </div>
                )}
              </div>
              <Input
                id="sourceQty"
                type="text"
                inputMode="numeric"
                value={sourceQty}
                onChange={(e) => setSourceQty(formatNumberWithCommas(e.target.value))}
                // ✅ Read-only in edit mode; create-mode uses the toggle
                disabled={isEditMode || !isSourceQtyEditable}
                className={`bg-white border-border text-right ${
                  isEditMode || !isSourceQtyEditable
                    ? 'bg-muted cursor-not-allowed'
                    : ''
                }`}
                required
              />
              <p className="text-xs text-muted-foreground">
                {isEditMode
                  ? 'Source quantity cannot be changed after creation.'
                  : 'Default is 1. Toggle to allow editing.'}
              </p>
            </div>

            {/* Target Quantity */}
            <div className="space-y-2">
              <Label htmlFor="targetQty" className="text-foreground">
                Target Quantity *
              </Label>
              <Input
                id="targetQty"
                type="text"
                inputMode="numeric"
                value={targetQty}
                onChange={(e) => setTargetQty(formatNumberWithCommas(e.target.value))}
                placeholder="e.g. 10"
                className="bg-white border-border text-right"
                required
              />
              <p className="text-xs text-muted-foreground">
                Amount produced per split.
              </p>
            </div>
          </div>

          {/* ---- Status toggle (edit mode only) ---- */}
          {isEditMode && (
            <div className="flex items-center justify-between p-3 border-1 border-border bg-secondary rounded-lg">
              <div>
                <Label htmlFor="status" className="text-foreground">
                  Active Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  {statusActive
                    ? 'Split setup is active and usable.'
                    : 'Split setup is inactive and will be skipped.'}
                </p>
              </div>
              <Switch
                id="status"
                checked={statusActive}
                onCheckedChange={setStatusActive}
              />
            </div>
          )}

          {/* ---- Preview (create mode only) ---- */}
          {!isEditMode && selectedSource && selectedTarget && targetQty && (
            <div className="p-3 bg-secondary rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-1">Preview</p>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{sourceQty}</span> x{' '}
                <span className="font-semibold">{selectedSource.name}</span>{' '}
                <ArrowRight className="inline w-3 h-3 mx-1" />
                <span className="font-semibold">{targetQty}</span> x{' '}
                <span className="font-semibold">{selectedTarget.name}</span>
              </p>
            </div>
          )}

          {/* ---- Actions ---- */}
          <div className="flex justify-end gap-3 pt-4">
            {isEditMode && (
              <Button
                type="button"
                className="bg-red-600 text-primary-foreground hover:bg-red-700"
                onClick={() => setShowDeleteAlert(true)}
              >
                Delete
              </Button>
            )}
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isEditMode ? 'Save Changes' : 'Create Split Setup'}
            </Button>
            <Button type="button" variant="outline" onClick={closeModal}>
              Close
            </Button>
          </div>
        </form>
      </Modal>

      <SweetAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteAlert(false)}
        type="error"
        title="Delete Split Setup?"
        message="This action cannot be undone."
        confirmText="Yes, Delete"
        showCancelButton={true}
        showCloseButton={false}
      />

      {toast.ToastComponent}
    </div>
  );
}
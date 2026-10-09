'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { Role, AppRoute } from '@/lib/types';
import { Edit, Trash2, ShieldCheck, FileText, ArrowDown, ChevronDown } from 'lucide-react';
import axiosInstance from '@/lib/customAxios';
import { Switch } from '@/components/ui/switch';
import { useToaster } from '@/components/util/CustomToast';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import SweetAlert from '@/components/util/SweetAlert';

export default function RolesPage() {
  const toast = useToaster();
  const [appRoutes, setAppRoutes] = useState<AppRoute[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Delete confirmation state
  const [showAlert, setShowAlert] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    void loadRoles();
    void getAppRoutes();
  }, []);

  const loadRoles = async () => {
    try {
      const { data } = await axiosInstance.get(`/positions?OnlyActive=${false}`);
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAppRoutes = async () => {
    try {
      const { data } = await axiosInstance.get('/app/Routes');
      setAppRoutes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPermissions([]);
    setEditingRole(null);
    setIsActive(false);
  };

  const openModal = (role?: Role) => {
    if (role) {

      setEditingRole(role);
      setName(role.name);
      setDescription(role.description);

      // Support BOTH field names so we work regardless of API naming
      const existingPermissions =
        (role as any).permissions ??
        (role as any).routes ??
        [];

      setPermissions([...existingPermissions]);
      setIsActive(role.status);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setPermissions((prev) => {
      const next = checked
        ? prev.includes(permissionId)
          ? prev
          : [...prev, permissionId]
        : prev.filter((p) => p !== permissionId);
      return next;
    });
  };

  const handleParentPermissionChange = (permissionId: string, checked: boolean) => {
    setPermissions((prev) => {
      const next = checked
        ? prev.includes(permissionId)
          ? prev
          : [...prev, permissionId]
        : prev.filter((p) => p !== permissionId);
      return next;
    });
  };

  const processSubmission = async () => {
    // Send BOTH field names so we're compatible with either backend DTO.
    // Once you confirm which one the API expects, delete the other.
    const roleData: Record<string, any> = {
      title: name,
      status: isActive,
      description,
      routes: permissions,
      permissions, // ← duplicate for safety; remove after confirming
    };


    if (editingRole) {
      await axiosInstance.put('/positions', {
        ...roleData,
        id: editingRole.id,
      });
    } else {
      await axiosInstance.post('/positions', roleData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 0));

    try {
      await processSubmission();
      await loadRoles();
      setIsModalOpen(false);
      resetForm();

      toast.success({
        title: 'Submitted successfully',
        description: 'Role saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.warning({
        title: 'Failed to save role',
        description:
          error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = (role: Role) => {
    setRoleToDelete(role);
    setShowAlert(true);
  };

  const confirmDelete = async () => {
    const role = roleToDelete;
    setShowAlert(false);
    setRoleToDelete(null);
    if (!role) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 0));

    try {
      await axiosInstance.delete(`/positions/${role.id}`);
      await loadRoles();
      toast.success({
        title: 'Deleted successfully',
        description: 'Role deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.warning({
        title: 'Failed to delete role',
        description: 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = () => {
  // Select every parent and every child
  const allIds = flatRoutes.map((r) => r.id);
  setPermissions(allIds);
};

const handleDeselectAll = () => {
  setPermissions([]);
};

// Select every child of a given parent (does NOT toggle the parent itself)
const handleSelectChildren = (parentId: string) => {
  const parent = appRoutes.find((r) => r.id === parentId);
  const childIds = parent?.children?.map((c) => c.id) ?? [];
  setPermissions((prev) =>
    Array.from(new Set([...prev, ...childIds]))
  );
};

// Remove every child of a given parent (does NOT toggle the parent)
const handleClearChildren = (parentId: string) => {
  const parent = appRoutes.find((r) => r.id === parentId);
  const childIds = new Set(parent?.children?.map((c) => c.id) ?? []);
  setPermissions((prev) => prev.filter((p) => !childIds.has(p)));
};

  // Flatten the route tree once for badge lookup
  const generateAllAppRoutes = (routes: AppRoute[]): AppRoute[] => {
    let allRoutes: AppRoute[] = [];
    routes.forEach((element) => {
      allRoutes.push(element);
      if (element?.children?.length > 0) {
        allRoutes = allRoutes.concat(generateAllAppRoutes(element.children));
      }
    });
    return allRoutes;
  };

  const flatRoutes = generateAllAppRoutes(appRoutes);

  const getRolePermissions = (role: Role): string[] =>
    (role as any).permissions ?? (role as any).routes ?? [];

  const columns = [
    {
      key: 'name' as keyof Role,
      label: 'Role Name',
      sortable: true,
      render: (role: Role) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{role.name}</p>
            <p className="text-xs text-muted-foreground">{role.description}</p>
          </div>
        </div>
      ),
    },

   {
  key: 'status' as keyof Role,
  label: 'Status',
  sortable: true,
  render: (role: Role) => (
    <Badge
      className={
        role.status
          ? 'bg-success/20 text-success border border-success/30'
          : 'bg-destructive/10 text-destructive border border-destructive/30'
      }
    >
      {role.status ? 'Active' : 'Inactive'}
    </Badge>
  ),
},
    {
      key: 'permissions' as keyof Role,
      label: 'Permissions',
      render: (role: Role) => {
        const perms = getRolePermissions(role);
        return (
          <div className="flex flex-wrap gap-1 max-w-md">
            {perms.slice(0, 3).map((perm, index) => (
              <Badge key={`${perm}-${index}`} variant="outline" className="text-xs">
                {flatRoutes.find((x) => x.id === perm)?.title ?? perm}
              </Badge>
            ))}
            {perms.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{perms.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions' as keyof Role,
      label: 'Actions',
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" onClick={() => openModal(role)}>
            <Edit className="w-4 h-4" />
          </Button> */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
               e.stopPropagation();  requestDelete(role)
            }}
            disabled={role.name === 'Administrator'}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {(isLoading || isSubmitting) && <LoadingOverlay />}
      <div className="min-h-screen">
        <Header title="Roles" description="Manage user roles and permissions" />

        <div className="mt-2">
          <DataTable
            title="All Roles"
            data={roles}
            columns={columns}
            searchKey="name"
            onAdd={() => openModal()}
            addLabel="Add Role"
            emptyMessage="No data found."
            height='h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]'
             onRowClick={(role) => openModal(role)}
          />
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingRole ? 'Edit Role' : 'Add New Role'}
          size="full"
        >
          <form onSubmit={handleSubmit} className="space-y-3 flex flex-col">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* LEFT COLUMN */}
    <div className="space-y-3">
      {/* Role Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-foreground">
          Role Name
        </Label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Designation"
            className="pl-10 bg-white border-border"
            required
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-foreground">
          Description
        </Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this role can do..."
            className="pl-10 bg-white border-border min-h-[80px] resize-none"
            required
          />
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
        <div>
          <Label htmlFor="isActive" className="text-foreground">
            Active Status
          </Label>
          <p className="text-xs text-muted-foreground">
            Enable or disable this role
          </p>
        </div>
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>
    </div>

    {/* RIGHT COLUMN — Permissions */}
    <div className="space-y-0 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-foreground">Permissions</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-primary hover:underline font-medium"
          >
            Select all
          </button>
          <span className="text-xs text-muted-foreground">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs text-primary hover:underline font-medium"
          >
            Deselect all
          </button>
        </div>
      </div>

      <div
  className="grid grid-cols-1 gap-1 overflow-y-auto p-4 bg-secondary rounded-lg flex-1"
  style={{
    border: '1px solid black',
    maxHeight: '420px',
    minHeight: '320px',
  }}
>
  {appRoutes.map((route: AppRoute) => {
    const hasChildren = route.children?.length > 0;
    const childIds = route.children?.map((c) => c.id) ?? [];
    const allChildrenSelected =
      hasChildren && childIds.every((id) => permissions.includes(id));

    return (
      <div key={route.id}>
        {/* Parent row */}
        <div className="flex items-center justify-between">
          <div style={{ display: 'flex' }} className="items-center">
            <Checkbox
              style={{ border: '1px solid green' }}
              id={route.id}
              checked={permissions.includes(route.id)}
              onCheckedChange={(checked) =>
                handleParentPermissionChange(route.id, !!checked)
              }
            />
            <label
              htmlFor={route.id}
              className="text-sm font-medium text-foreground pl-1 cursor-pointer"
            >
              {route.title}
            </label>
          </div>
            {hasChildren && (!permissions.includes(route.id)) && <ChevronDown/>}

          {/* Per-parent Select all — only shown when the parent has children */}
          {hasChildren && permissions.includes(route.id) && (
            <button
              type="button"
              onClick={() =>
                allChildrenSelected
                  ? handleClearChildren(route.id)
                  : handleSelectChildren(route.id)
              }
              className="text-xs text-primary hover:underline font-medium"
            >
              {allChildrenSelected ? 'Clear' : 'Select all'}
            </button>
          )}
        </div>

        {/* Children */}
        <div
          className="space-y-2"
          style={{ overflowY: 'scroll', marginBottom: '10PX' }}
        >
          {permissions?.includes(route?.id) &&
            hasChildren &&
            route.children.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center gap-2"
                style={{ paddingLeft: '30px' }}
              >
                <Checkbox
                  style={{ border: '1px solid green' }}
                  id={perm.id}
                  checked={permissions.includes(perm.id)}
                  onCheckedChange={(checked) =>
                    handlePermissionChange(perm.id, !!checked)
                  }
                />
                <Label
                  htmlFor={perm.id}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {perm.title}
                </Label>
              </div>
            ))}
        </div>
        <hr />
      </div>
    );
  })}
</div>
    </div>
  </div>

  {/* STICKY FOOTER — always visible, never scrolls with the form */}
  <div className="flex justify-end gap-3 pt-2 border-t sticky bottom-0 bg-white">
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        setIsModalOpen(false);
        resetForm();
      }}
    >
      Cancel
    </Button>
    <Button
      type="submit"
      disabled={isSubmitting}
      className="bg-primary text-primary-foreground hover:bg-primary/90"
    >
      {editingRole ? 'Update Role' : 'Create Role'}
    </Button>
  </div>
</form>
        </Modal>

        <SweetAlert
          isOpen={showAlert}
          onClose={() => {
            setShowAlert(false);
            setRoleToDelete(null);
          }}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowAlert(false);
            setRoleToDelete(null);
          }}
          type="error"
          title="Delete Role?"
          message={
            roleToDelete
              ? `Are you sure you want to delete "${roleToDelete.name}"? This action cannot be undone.`
              : 'This action cannot be undone.'
          }
          confirmText="Yes, Delete"
          showCancelButton={true}
          showCloseButton={false}
        />

        <>{toast.ToastComponent}</>
      </div>
    </>
  );
}
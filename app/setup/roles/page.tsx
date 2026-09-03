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
import { roleService } from '@/lib/api-service';
import type { Role } from '@/lib/types';
import { Edit, Trash2, ShieldCheck, FileText } from 'lucide-react';
import axiosInstance from '@/lib/customAxios';
import { AppRoute } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export default function RolesPage() {
  const toast = useToaster();
  const [appRoutes, setAppRoutes] = useState<AppRoute []>([])
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await axiosInstance.get('/positions');
      setRoles(data?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPermissions([]);
    setEditingRole(null);
    setIsActive(false)
    setIsActive(false)
    setIsLoading(false)
  };

  const openModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setName(role.name);
      setDescription(role.description);
      setPermissions(role.permissions);
      setIsActive(role.status)
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setPermissions([...permissions, permissionId]);
    } else {
      setPermissions(permissions.filter(p => p !== permissionId));
    }
  };

  const handleParentPermissionChange = (permissionId: string, checked: boolean) => {
    if (permissions.includes(permissionId)) {
      var allChildren = appRoutes.find(x=> x.id == permissionId)?.children.map(x=> x.id)
      let newPermissions = permissions.filter(p => p !== permissionId);
      if (allChildren) newPermissions = newPermissions.filter(p => !allChildren?.includes(p));
      setPermissions([...newPermissions]);
    } else {
      setPermissions([...permissions, permissionId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setIsLoading(true)
    e.preventDefault();

    const roleData = {
      // companyId: user.companyId,
      title : name,
      status : isActive,
      description,
      routes : permissions,
    };

    try {
      if (editingRole) {
        await axiosInstance.put('/positions', {...roleData, id : editingRole?.id});
      } else {
         await axiosInstance.post('/positions', roleData)
      }
      
      toast.success({
          title: 'Submitted successfully',
          description: 'Role saved successfully',
      })

      await loadRoles();
      setIsModalOpen(false);
      resetForm();

    } catch (error: any) {
      console.error('Error saving role:', error);

      toast.warning({
          title: 'Failed to save role',
           description: error?.response?.data?.message || 'Please try again later',
        })
    }
    finally {
      setIsLoading(false)
    }
  };

  const handleDelete = async (role: Role) => {
    if (confirm(`Are you sure you want to delete "${role.name}"?`)) {
      try {
        await axiosInstance.delete(`/positions/${role.id}`, );
        await loadRoles();

        toast.success({
          title: 'Deleted successfully',
          description: 'Role deleted successfully',
      })
      } catch (error) {
        console.error('Error deleting role:', error);

         toast.warning({
          title: 'Failed to delete role',
          description: 'Please try again later',
        })
      }
    }
  };

  const getAppRoutes = async () => {
    await axiosInstance.get('/app/Routes').then(response => {
      setAppRoutes(response?.data)
      
    });
  }


  const generateAllAppRoutes =  (appRoutes : AppRoute[]) :  AppRoute[] => {
    let allRoutes : AppRoute[] = []
    appRoutes.forEach(element => {
      allRoutes.push(element)
      
        if  (element?.children?.length > 0) {
            generateAllAppRoutes(element?.children)
        }
    });
    return allRoutes
  }

  useEffect(() => {
    getAppRoutes();
  }, [])

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
      key: 'permissions' as keyof Role,
      label: 'Permissions',
      render: (role: Role) => (
        <div className="flex flex-wrap gap-1 max-w-md">
            {
              role?.permissions?.slice(0, 3).map((perm, index) => (
                <div key={index}>
                  <Badge  variant="outline" className="text-xs">
                    {generateAllAppRoutes(appRoutes)?.find(x=> x.id == perm)?.title}
                  </Badge>
                </div>

              ))
            }
          
            {role?.permissions?.length > 3 && !role?.permissions?.includes('all') && (
              <Badge variant="outline" className="text-xs">
                +{role?.permissions?.length - 3} more
              </Badge>
            )}
        </div>
      ),
    },
    
    {
      key: 'actions' as keyof Role,
      label: 'Actions',
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => openModal(role)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(role)}
            disabled={role.name === 'Administrator'}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }


  return (
    <div className="min-h-screen">
      <Header title="Roles" description="Manage user roles and permissions" />

      <div className="p-6">
        <DataTable
          title="All Roles"
          data={roles}
          columns={columns}
          searchKey="name"
          onAdd={() => openModal()}
          addLabel="Add Role"
          emptyMessage="No roles found. Create your first role to get started."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingRole ? 'Edit Role' : 'Add New Role'}
        // description={editingRole ? 'Update role information and permissions' : 'Create a new role with specific permissions'}
        size="md"
      >
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Role Name</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Manager"
                className="pl-10 bg-white border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this role can do..."
                className="pl-10 bg-white border-border min-h-[80px]"
                required
                
              />
            </div>
          </div>

            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div>
                <Label htmlFor="isActive" className="text-foreground">Active Status</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this role</p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

          <div className="space-y-0">
            <Label className="text-foreground">Permissions</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-64 overflow-y-auto p-4 bg-secondary rounded-lg" style={{border:'1px solid black', maxHeight:"220px"}}>
              {appRoutes.map((route : AppRoute) => (
                <div key={route.id}>
                  {<div style={{display:"flex"}}>
                    <Checkbox
                      style={{border:"1px solid green"}}
                      id={route.id}
                      checked={permissions.includes(route.id)}
                      onCheckedChange={(checked) => handleParentPermissionChange(route.id, !!checked)}
                    />
                    <p className="text-sm font-medium text-foreground mb-2 pl-1">{route.title}</p>
                  </div>}
                  <div className="space-y-2" style={{maxHeight:"100px", overflowY:"scroll", marginBottom:"10PX"}}>
                    {permissions?.includes(route?.id) && route.children.length > 0 && route.children.map(perm => (
                      <div key={perm.id} className="flex items-center gap-2" style={{ paddingLeft:"30px"}}>
                        <Checkbox
                          style={{border:"1px solid green"}}
                          id={perm.id}
                          checked={permissions.includes(perm.id)}
                          onCheckedChange={(checked) => handlePermissionChange(perm.id, !!checked)}
                        />
                        <Label htmlFor={perm.id} className="text-sm text-muted-foreground cursor-pointer">
                          {perm.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <hr></hr>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-0">
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
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

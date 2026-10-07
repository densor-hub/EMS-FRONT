'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MultiSelectComponent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee, Shop, Role } from '@/lib/types';
import { Edit, Trash2, User, Mail, Phone, DollarSign, Calendar } from 'lucide-react';
import axiosInstance from '@/lib/customAxios';
import { alphaNumericDate, formatNumberWithCommas, removeCommasFromNumbers } from '@/helpers/formatStrings';
import { useToaster } from '@/components/util/CustomToast';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { config } from '@/components/util/AppConfig';
import { useAuth } from '@/lib/auth-context';
import SweetAlert from '@/components/util/SweetAlert';

const employeeStatuses = [
  { id: 0, name: 'Deactivated' },
  { id: 1, name: 'Active' },
  { id: 2, name: 'On Leave' },
  { id: 3, name: 'Suspended' },
  { id: 4, name: 'Resigned' },
  { id: 5, name: 'Terminated' },
];

export default function EmployeesPage() {
  const toast = useToaster();
  const { selectedShop } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Delete confirmation state
  const [showAlert, setShowAlert] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedShops, setselectedShops] = useState<string[]>([]);
  const [roleId, setRoleId] = useState('');
  const [salary, setSalary] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isAppUser, setIsAppUser] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadEmployees();
    loadData();
  }, []);

  const loadEmployees = async () => {
    try {
      const employeesData = await axiosInstance.get('/employees');
      setEmployees(employeesData?.data);
    } catch (error) {
      console.log(error);
    }
  };

  const loadData = async () => {
    try {
      const shopsData = await axiosInstance.get('/locations');
      const rolesData = await axiosInstance.get(`/positions?ForTransactions`);
      setShops(shopsData?.data);
      setRoles(rolesData?.data);
    } catch (error) {
      console.log(error);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setselectedShops([]);
    setRoleId('');
    setSalary('');
    setHireDate('');
    setIsActive(true);
    setEditingEmployee(null);
    setStatus('');
    setIsAppUser(false);
    setIsLoading(false);
  };

  const openModal = (employee?: Employee) => {
    let locationIds: string[] = [];

    if (employee?.locations !== undefined) {
      if (employee?.locations?.length > 0) {
        locationIds = employee.locations.map((x: any) => x.id.toString());
      }
    }

    if (employee) {
      setEditingEmployee(employee);
      setFirstName(employee.firstName);
      setLastName(employee.lastName);
      setEmail(employee.email);
      setPhone(employee.phone);
      setselectedShops(locationIds || selectedShops);
      setRoleId(employee.roleId);
      setSalary(formatNumberWithCommas(employee.salary.toString()));
      setHireDate(employee.hireDate);
      setIsActive(employee.isActive);
      setIsAppUser(employee.isAppUser);
      setStatus(employee.status.toString());
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setIsLoading(true);
    e.preventDefault();

    const employeeData = {
      firstName,
      lastName,
      phone,
      email,
      address: '',
      isAppUser: true,
      locations: selectedShops,
      positionId: roleId,
      salary: parseFloat(removeCommasFromNumbers(salary).toString()),
      hireDate,
      status: Number(status),
    };

    try {
      if (editingEmployee) {
        await axiosInstance.put('/employees', {
          ...employeeData,
          id: editingEmployee.id,
        });
      } else {
        await axiosInstance.post(
          `/employees/${selectedShop || sessionStorage?.getItem('selectedShop')}`,
          employeeData
        );
      }

      await loadEmployees();
      setIsModalOpen(false);
      resetForm();

      toast.success({
        title: 'Submitted successfully',
        description: 'Employee saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving employee:', error.response?.data?.message);
      toast.warning({
        title: 'Failed to submit',
        description: error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: open the confirmation dialog
  const requestDelete = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowAlert(true);
    setIsModalOpen(false);
  };

  // Step 2: confirmed — perform the delete
  const confirmDelete = async () => {
    const employee = employeeToDelete;
    setShowAlert(false);
    setEmployeeToDelete(null);
    if (!employee) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 0));

    try {
      await axiosInstance.delete(`/employees/${employee.id}`);
      await loadEmployees();
      toast.success({
        title: 'Deleted successfully',
        description: 'Employee deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.warning({
        title: 'Failed to delete employee',
        description: 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: `${config.currency}`,
    }).format(amount);

  const columns = [
    {
      key: 'firstName' as keyof Employee,
      label: 'Employee',
      sortable: true,
      render: (employee: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {employee.firstName[0]}{employee.lastName[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{employee.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roleId' as keyof Employee,
      label: 'Role',
      render: (employee: Employee) => (
        <Badge variant="outline">
          {roles?.find((x) => x.id === employee.roleId)?.name}
        </Badge>
      ),
    },
    {
      key: 'salary' as keyof Employee,
      label: 'Salary',
      sortable: true,
      render: (employee: Employee) => (
        <span className="font-medium text-foreground">
          {formatCurrency(employee.salary)}
        </span>
      ),
    },
    {
      key: 'isActive' as keyof Employee,
      label: 'Status',
      render: (employee: Employee) => (
        <Badge
          className={
            employee.status.toString() === '1'
              ? 'bg-success/20 text-success'
              : 'bg-muted text-muted-foreground'
          }
        >
          {employeeStatuses.find((x) => x.id.toString() == employee.status)?.name}
        </Badge>
      ),
    },
    {
      key: 'isAppUser' as keyof Employee,
      label: 'App User',
      render: (employee: Employee) => (
        <Badge
          className={
            employee.isAppUser
              ? 'bg-success/20 text-success'
              : 'bg-muted text-muted-foreground'
          }
        >
          {employee.isAppUser ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'hireDate' as keyof Employee,
      label: 'Hire Date',
      sortable: true,
      render: (employee: Employee) => (
        <span className="font-medium text-foreground">
          {alphaNumericDate(employee.hireDate)}
        </span>
      ),
    },
    {
      key: 'actions' as keyof Employee,
      label: 'Actions',
      render: (employee: Employee) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              requestDelete(employee);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {isLoading && <LoadingOverlay />}
      <Header title="Employees" description="Manage your workforce" />

      <div className="m-2">
        <DataTable
          title="All Employees"
          data={employees}
          columns={columns}
          searchKey="firstName"
          onAdd={() => openModal()}
          addLabel="Add Employee"
          emptyMessage="No data found."
          onRowClick={(emp) => openModal(emp)}
          height="h-[calc(100vh-220px)] sm:h-[calc(100vh-198px)]"
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        description={
          editingEmployee ? 'Update employee information' : 'Add a new team member'
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="pl-10 bg-white border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="bg-white border-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  className="pl-10 bg-white border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="pl-10 bg-white border-border"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shop" className="text-foreground">Shop(s)</Label>
              <MultiSelectComponent
                selectedItems={selectedShops}
                items={shops.map((x) => ({
                  id: x.id,
                  name: x.name,
                  description: '',
                }))}
                label=""
                setSelectedItems={setselectedShops}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">Role</Label>
              <Select value={roleId} onValueChange={setRoleId} required>
                <SelectTrigger className="bg-white border-border w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary" className="text-foreground">
                Monthly Salary ({config.currency})
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="salary"
                  value={salary}
                  onChange={(e) => setSalary(formatNumberWithCommas(e.target.value))}
                  placeholder="50000"
                  className="pl-10 bg-white border-border"
                  required
                />
              </div>
            </div>

            <div className="space-0">
              <Label htmlFor="hireDate" className="text-xs sm:text-sm w-full">
                Hire Date
              </Label>
              <Input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border-gray-300"
                required={!hireDate}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {editingEmployee && (
              <div className="space-y-2">
                <Label htmlFor="status" className="text-foreground">Status</Label>
                <Select value={status} onValueChange={setStatus} required>
                  <SelectTrigger className="bg-white border-border w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeStatuses.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div
              className={`flex items-center justify-between p-4 bg-secondary rounded-lg ${
                !editingEmployee ? 'col-span-2' : ''
              }`}
            >
              <div>
                <Label htmlFor="isActive" className="text-foreground">
                  Is App User
                </Label>
                <p className="text-xs text-muted-foreground">
                  Employee can access the system
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isAppUser}
                onCheckedChange={setIsAppUser}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {editingEmployee ? 'Update Employee' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      <SweetAlert
        isOpen={showAlert}
        onClose={() => {
          setShowAlert(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowAlert(false);
          setEmployeeToDelete(null);
        }}
        type="error"
        title="Delete Employee?"
        message={
          employeeToDelete
            ? `Are you sure you want to delete "${employeeToDelete.firstName} ${employeeToDelete.lastName}"? This action cannot be undone.`
            : 'This action cannot be undone.'
        }
        confirmText="Yes, Delete"
        showCancelButton={true}
        showCloseButton={false}
      />

      {toast.ToastComponent}
    </div>
  );
}
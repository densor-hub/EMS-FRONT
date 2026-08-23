'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { DataTable } from '@/components/dashboard/data-table';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, MultiSelectComponent } from '@/components/ui/select';
import { itemService } from '@/lib/api-service';
import type { Item, Shop } from '@/lib/types';
import { Edit, Trash2, Package, DollarSign, Hash, Tag, FileText, Layers } from 'lucide-react';
import { currency, formatNumberWithCommas, removeCommasFromNumbers, volume } from '@/helpers/formatStrings';
import { useAuth } from '@/lib/auth-context';
import axiosInstance from '@/lib/customAxios';
import { useToast } from '@/hooks/use-toast';

//cat Academics =1, Food =2, Tech=3, Cloths=4, Construction=5, Tools=6, Electronics=7, Other=8 
//units Piece = 1, Box =2, Set =3, Pack = 4, Liter = 5, Yards = 6, Meters = 7, Feets = 8

const CATEGORIES = [{name: 'Academics' , id : "1"}, {name: 'Food' , id : "2"}, {name: 'Tech' , id : "3"},
   {name: 'Cloths' , id : "4"}, {name: 'Construction' , id : "5"}, {name: 'Tools' , id : "6"},
   {name: 'Electronics' , id : "7"},{name: 'Other' , id : "8"}];

const UNITS = [{name: 'Piece' , id : "1"}, {name: 'Box' , id : "2"}, {name: 'Set' , id : "3"},
   {name: 'Pack' , id : "4"}, {name: 'Liter' , id : "5"}, {name: 'Yards' , id : "6"},
   {name: 'Meters' , id : "7"},{name: 'Feets' , id : "8"}];

export default function ItemsPage() {
  const sessionShop = sessionStorage.getItem("selectedShop")
  const {user, selectedShop} = useAuth()
  const {toast} = useToast()
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
   const [shops, setShops] = useState<Shop[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [code, setcode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quanityInUnit, setQuanityInUnit] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [status, setstatus] = useState(true);
   const [selectedShops, setselectedShops] = useState<string []>([]);

  useEffect(() => {
    loadItems();
    loadData();
  }, []);

  const loadItems = async () => {
    try {
      const data = await axiosInstance.get(`/items?LocationId=${selectedShop || sessionShop}`);
      setItems(data?.data);
    } finally {
      setIsLoading(false);
    }
  };


  const loadData = async () => {
    try {
      //shops 
      const shopsData = await axiosInstance.get('/locations');
      //  const rolesData = await axiosInstance.get('/positions');
      setShops(shopsData?.data);
      // setRoles(rolesData?.data);

    } catch (error) {
      console.log(error)
    }
  };

  const resetForm = () => {
    setName('');
    setcode('');
    setDescription('');
    setCategory('');
    setCostPrice('');
    setSellingPrice('');
    setUnit('');
    setReorderLevel('');
    setstatus(true);
    setEditingItem(null);
    setselectedShops([]);
  };

  const openModal = (item?: Item) => {
    if (item) {
      let locationIds : string [] = [];

       if (item?.locations !== undefined ) {
            if (item?.locations?.length > 0) {
                locationIds = item.locations.map((x : any)=> { return x.id.toString()});
            }
        }

      setEditingItem(item);
      setName(item.name);
      setcode(item.code);
      setDescription(item.description);
      setCategory(item.category?.toString());
      setCostPrice(formatNumberWithCommas(item?.sellingPrice?.toString()));
      setSellingPrice(formatNumberWithCommas(item.sellingPrice.toString()));
      setUnit(item.unitOfMeasure?.toString());
      setReorderLevel(formatNumberWithCommas(item.reorderLevel?.toString()));
      setstatus(item.status);
      setselectedShops(locationIds);
      setQuanityInUnit(formatNumberWithCommas(item.quanityInUnit?.toString()))
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      code: code,
      name,
      description,
      category : Number(category),
      unitOfMeasure : Number(unit),
      quantityInUnit : parseInt(removeCommasFromNumbers(quanityInUnit).toString()),
      sellingPrice : parseFloat(removeCommasFromNumbers(sellingPrice).toString()),
      costPrice: parseFloat(removeCommasFromNumbers(costPrice).toString()),
      reorderLevel: removeCommasFromNumbers(reorderLevel),
      locations : selectedShops,
      status : status,
      companyId: user?.companyId
    };

    if (itemData?.sellingPrice < itemData?.costPrice) {
      toast.warning({
          title:  'Selling Price cannot be less than cost price'
      });
       return
    }
    setIsLoading(true)

    try {
      if (editingItem) {
        await axiosInstance.put('/items/UpdateItem', {...itemData, id : editingItem.id});
      } else {
        await axiosInstance.post('/items', itemData);
      }
      await loadItems();
      setIsModalOpen(false);
      resetForm();

      toast.success({
          title: 'Submitted successfully',
          description: 'Item saved successfully',
      })
    } catch (error : any) {
      console.error('Error saving item:', error?.response);

      toast.warning({
          title:  'Failed to submit',
          description: error?.response?.data?.message ||  error?.response?.data?.error || 'Please try again later',
      })
    }
    finally{
      setIsLoading(false)
    }
  };

  const handleDelete = async (item: Item) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        setIsLoading(true)
        await axiosInstance.delete(`/items/${item.id}`);
        await loadItems();

        toast.success({
          title: 'Submitted successfully',
          description: 'Item deleted successfully',
      })
      } catch (error: any) {
        console.error('Error deleting item:', error);
        
        toast.warning({
          title:  'Failed to submit',
          description: error?.response?.data?.message || error?.response?.data?.error || 'Please try again later',
      })
      }
      finally{
        setIsLoading(false)
      }
    }
  };

  // const getProfit = (item: Item) => item.sellingPrice - item.costPrice;
  // const getProfitMargin = (item: Item) => ((getProfit(item) / item.costPrice) * 100).toFixed(1);

  const columns = [
    {
      key: 'name' as keyof Item,
      label: 'Item',
      sortable: true,
      render: (item: Item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">code: {item.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category' as keyof Item,
      label: 'Category',
      render: (item: Item) => (
        <Badge variant="outline">{CATEGORIES?.find(x=> x.id == item.category)?.name}</Badge>
      ),
    },
   
    {
      key: 'sellingPrice' as keyof Item,
      label: 'Selling Price (GHS)',
      sortable: true,
      render: (item: Item) => (
        <span className="font-medium text-foreground text-center">{formatNumberWithCommas(item.sellingPrice?.toString())}</span>
      ),
    },
    
    {
      key: 'reorderLevel' as keyof Item,
      label: 'Reorder Level',
      render: (item: Item) => (
        <span className="text-muted-foreground">{formatNumberWithCommas(item.reorderLevel?.toString())}</span>
      ),
    },
    {
      key: 'status' as keyof Item,
      label: 'Status',
      render: (item: Item) => (
        <Badge className={item.status ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}>
          {item.status ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions' as keyof Item,
      label: 'Actions',
      render: (item: Item) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => openModal(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
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
      <Header title="Items" description="Manage your items catalog" />

      <div className="p-6">
        <DataTable
          title="All Items"
          data={items}
          columns={columns}
          searchKey="name"
          onAdd={() => openModal()}
          addLabel="Add Item"
          emptyMessage="No items found. Add your first item to get started."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
        description={editingItem ? 'Update item information' : 'Add a new item to your catalog'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Name *</Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter item name"
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className="text-foreground">Code</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setcode(e.target.value)}
                  placeholder="Enter unique code"
                  className="pl-10 bg-secondary border-border"
                  readOnly={true}
                  // color='blue'
                  style={{color:"blue"}}
                  // required
                />
              </div>
            </div>
          </div>

            <div className="space-y-2">
              <Label htmlFor="shop" className="text-foreground">Shops *</Label>
              <MultiSelectComponent
                selectedItems={selectedShops}
                items={shops.map(x=> {
                  return {id : x.id, name: x.name, description : ""}
                })}
                 label=''
                setSelectedItems={setselectedShops}

              />
            </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the item..."
                className="pl-10 bg-secondary border-border min-h-[80px]"
                // required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">Category *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat?.id} value={cat.id}>{cat?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full" >
              <Label htmlFor="unit" className="text-foreground">Unit Of Measure *</Label>
              <Select value={unit} onValueChange={setUnit} required >
                <SelectTrigger className="bg-secondary border-border w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => (
                    <SelectItem key={u?.id} value={u?.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {<div className="space-y-2">
              <Label htmlFor="quanityInUnit" className="text-foreground">{`Quantity In ${UNITS.find(x=> x.id === unit)?.name}`} *</Label>
               <Input
                id="quanityInUnit"
                value={quanityInUnit}
                onChange={(e) => setQuanityInUnit(formatNumberWithCommas(e.target.value))}
                placeholder={`Enter Qty in ${UNITS.find(x=> x.id == unit)?.name}`}
                className=" bg-secondary border-border"
                required
              />
            </div>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice" className="text-foreground">Unit Cost Price *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="costPrice"
                  value={costPrice}
                  onChange={(e) => setCostPrice(formatNumberWithCommas(e.target.value))}
                  onBlur={() => setCostPrice(currency(costPrice))}
                  placeholder=""
                  className="pl-10 bg-secondary border-border"
                  required
                  // min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="text-foreground">Unit Selling Price *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sellingPrice"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(formatNumberWithCommas(e.target.value))}
                  onBlur={() => {setSellingPrice(currency(sellingPrice))}}
                  placeholder=""
                  className="pl-10 bg-secondary border-border"
                  required
                  // min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderLevel" className="text-foreground">Reorder Level *</Label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reorderLevel"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(formatNumberWithCommas(e.target.value))}
                  placeholder=""
                  className="pl-10 bg-secondary border-border"
                  required
                  // min="0"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <Label htmlFor="status" className="text-foreground">Active Status</Label>
              <p className="text-xs text-muted-foreground">Item available for sale</p>
            </div>
            <Switch
              id="status"
              checked={status}
              onCheckedChange={setstatus}
            />
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
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

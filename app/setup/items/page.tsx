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
import type { Item, Shop } from '@/lib/types';
import { Edit, Trash2, Package, DollarSign, Hash, Tag, FileText, Layers, Flag, LockIcon, UnlockIcon, UnlockKeyhole, LockOpenIcon, LockKeyholeOpenIcon } from 'lucide-react';
import { currency, formatNumberWithCommas, removeCommasFromNumbers, toastErrors, toastSuccess, volume } from '@/helpers/formatStrings';
import { useAuth } from '@/lib/auth-context';
import axiosInstance from '@/lib/customAxios';
import { useToaster } from '@/components/util/CustomToast';
import {  config } from '@/components/util/AppConfig';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import SweetAlert from '@/components/util/SweetAlert';
import { CustomSelect } from '@/components/util/CustomSelect';
import { sessionStore } from '@/helpers/formatStrings';
//cat Academics =1, Food =2, Tech=3, Cloths=4, Construction=5, Tools=6, Electronics=7, Other=8 
//units Piece = 1, Box =2, Set =3, Pack = 4, Liter = 5, Yards = 6, Meters = 7, Feets = 8



export default function ItemsPage() {
  const sessionShop = sessionStore.get("selectedShop")
  const {user, selectedShop} = useAuth()
  const toast = useToaster()
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setselectedItem] = useState<Item | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [code, setcode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  // const [costPrice, setCostPrice] = useState('');
  const [quanityInUnit, setQuanityInUnit] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [status, setstatus] = useState(true);
  const [selectedShops, setselectedShops] = useState<string []>([]);

   //alert
   const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (user?.companyId) {
      loadItems();
      locadLocations();
    }
  }, []);

  const loadItems = async () => {
    try {
      const data = await axiosInstance.get(`/items/Admin-View?LocationId=${selectedShop || sessionShop}`);
      setItems(data?.data);
    } finally {
      setIsLoading(false);
    }
  };


  const locadLocations = async () => {
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
    // setCostPrice('');
    setSellingPrice('');
    setUnit('');
    setReorderLevel('');
    setstatus(true);
    setselectedItem(null);
    setselectedShops([]);
    setQuanityInUnit('')
  };

  const openModal = (item?: Item) => {
    if (item) {
      let locationIds : string [] = [];

       if (item?.locations !== undefined ) {
            if (item?.locations?.length > 0) {
                locationIds = item.locations.map((x : any)=> { return x.id.toString()});
            }
        }

      setselectedItem(item);
      setName(item.name);
      setcode(item.code);
      setDescription(item.description);
      setCategory(item.category?.toString());
      // setCostPrice(formatNumberWithCommas(item?.sellingPrice?.toString()));
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
       costPrice: parseFloat(removeCommasFromNumbers("1").toString()),
      reorderLevel: removeCommasFromNumbers(reorderLevel),
      locations : selectedShops,
      status : status,
      companyId: user?.companyId
    };

    // if (itemData?.sellingPrice < itemData?.costPrice) {
    //   toast.warning({
    //       title:  'Selling Price cannot be less than cost price',
    //       description:""
    //   });
    //    return
    // }
    setIsLoading(true)

    try {
      if (selectedItem) {
        await axiosInstance.put('/items/UpdateItem', {...itemData, id : selectedItem.id});
      } else {
        await axiosInstance.post(`/items/${selectedShop || sessionShop}`, itemData);
      }
      await loadItems().then(() => {
        setIsModalOpen(false);
        resetForm();
        toastSuccess(toast, selectedItem ? "Updated successfully" : 'Submitted successfully' )
      });
     
    } catch (error : any) {
      console.error('Error saving item:', error?.response);

      toastErrors(toast, error, "");
    }
    finally{
      setIsLoading(false)
    }
  };

  const handleDelete = async () => {
      try {
        setIsLoading(true)
        await axiosInstance.delete(`/items/${selectedItem?.id}`);
        await loadItems().then(() => {
          
          toast.success({
            title: 'Deleted successfully',
            description: '',
          })

          setselectedItem(null)
          setIsModalOpen(false)
        });

      } catch (error: any) {
        console.error('Error deleting item:', error);
        
        toastErrors(toast, error)
      }
      finally{
        setIsLoading(false)
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
          <div>
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.code}</p>
          </div>
        </div>
      ),
    },
    //  {
    //   key: 'code' as keyof Item,
    //   label: 'Code',
    //   render: (item: Item) => (
    //     <Badge variant="outline">{item?.code}</Badge>
    //   ),
    // },
    {
      key: 'category' as keyof Item,
      label: 'Category',
      render: (item: Item) => (
        <Badge variant="outline">{config.categories?.find(x=> x.id == item.category)?.name}</Badge>
      ),
    },
   
    {
      key: 'sellingPrice' as keyof Item,
      label: `Selling Price  ${config.currency}`,
      sortable: true,
      render: (item: Item) => (
        <span className="font-medium text-foreground text-center">{currency(item.sellingPrice?.toString())}</span>
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
        <Badge className={item.status ? 'bg-success/20 text-success' : 'bg-red-100 text-red-500'}>
          {item.status ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lockStatus' as keyof Item,
      label: 'Lock Status',
      render: (item: Item) => (
        <div className="flex justify-center gap-2" >
         
          {item?.locked  ? <LockIcon color='red' className='w-4 sm:w-6  m:auto'/> : <LockKeyholeOpenIcon color='green'  className='w-4 sm:w-6  m:auto'/>}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {isLoading &&  <LoadingOverlay/>}
      <Header title="Items" description="Manage your items catalog" />

      <div className="mt-2">
        <DataTable
          title="All Items"
          data={items?.sort((a,b) => a.name?.trim().localeCompare(b.name?.trim()))}
          columns={columns}
          searchKey="name"
          onAdd={() => openModal()}
          addLabel="Add Item"
          emptyMessage="No data found."
          height='h-[calc(100vh-270px)] sm:h-[calc(100vh-250px)]'
          onRowClick={(item) => openModal(item)}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={selectedItem ? 'Edit Item' : 'Add New Item'}
        description={selectedItem ? 'Update item information' : 'Add a new item to your catalog'}
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
                  className="pl-10 bg-white border-border"
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
                  className="pl-10 bg-white border-border"
                  readOnly={true}
                  // color='blue'
                  style={{color:"blue"}}
                  // required
                />
              </div>
            </div>
          </div>

          <div className='flex w-full flex-col md:flex-row gap-2 md:items-start'>
  <div className="space-y-2 w-full md:self-start">
    <Label htmlFor="shop" className="text-foreground">Shops *</Label>
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
  <div className="space-y-2 w-full md:self-start">
    <Label htmlFor="description" className="text-foreground">Description</Label>
    <div className="relative">
      <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
      <Textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Brief description of the item..."
        className="pl-10 bg-white border-border min-h-[40px]"
      />
    </div>
  </div>
</div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
            <div className="space-y-2 w-full">
              <Label htmlFor="category" className="text-foreground">Category *</Label>
                <CustomSelect
                options={config?.categories.map((x)=> { return {
                  value: x.id.toString(),
                  label: x.name
                }})}
                value={category}
                onValueChange={setCategory}
                placeholder={`Select category`}
                required={true}
                searchable={true}
                clearable={true}
                size="md"
              />
             
            </div>

            <div className="space-y-2 w-full" >
              <Label htmlFor="unit" className="text-foreground">Unit Of Measure *</Label>
              <CustomSelect
                options={config?.unitOfMeasurements.map((x)=> { return {
                  value: x.id.toString(),
                  label: x.name
                }})}
                value={unit}
                onValueChange={setUnit}
                placeholder={`Select UoM`}
                required={true}
                searchable={true}
                clearable={true}
                size="md"
                
              />
              
            </div>

            {<div className="space-y-2">
              <Label htmlFor="quanityInUnit" className="text-foreground">{`Quantity In ${config?.unitOfMeasurements?.find(x=> x.id === unit)?.name || "UoM"}`} *</Label>
               <Input
                id="quanityInUnit"
                value={quanityInUnit}
                onChange={(e) => setQuanityInUnit(formatNumberWithCommas(e.target.value))}
                placeholder={`Enter Qty in ${config?.unitOfMeasurements?.find(x=> x.id == unit)?.name || "UoM"}`}
                className=" bg-white border-border text-right"
                required
              />
            </div>}


              {/* <div className="space-y-2">
              <Label htmlFor="costPrice" className="text-foreground">Unit Cost Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/3 -translate-y-1/3 mr-2 h-4 text-muted-foreground tex:xs">
                 {config.currency}
                </span>
                <Input
                  id="costPrice"
                  value={costPrice}
                  onChange={(e) => setCostPrice(formatNumberWithCommas(e.target.value))}
                  onBlur={() => setCostPrice(currency(costPrice))}
                  placeholder=""
                  className="pl-12 bg-white border-border"
                  required
                  // min="0"
                />
              </div>
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="text-foreground">Unit Selling Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/3 -translate-y-1/3 mr-2 h-4 text-muted-foreground tex:xs">
                 {config.currency}
                </span>
                <Input
                  id="sellingPrice"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(formatNumberWithCommas(e.target.value))}
                  onBlur={() => {setSellingPrice(currency(sellingPrice))}}
                  placeholder=""
                  className="pl-12 bg-white border-border text-right"
                  required
                  // min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderLevel" className="text-foreground">Reorder Level * <span className='text-xs'>(Pieces)</span></Label>
              <div className="relative">
                {/* <span className="absolute left-3 top-1/3 -translate-y-1/3 mr-2 h-4 text-muted-foreground tex:xs">
                 {config.currency}
                </span> */}
                <Input
                  id="reorderLevel"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(formatNumberWithCommas(e.target.value))}
                  placeholder=""
                  className="bg-white border-border text-right"
                  required
                  // min="0"
                />
              </div>
            </div>
          </div>

        
          <div className="flex items-center justify-between p-3 border-1 border-border bg-secondary rounded-lg">
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
            {selectedItem && <Button 
              type="button" 
              className="bg-red-600 text-primary-foreground hover:bg-red-700"
              onClick={() => {setShowAlert(true)}}

            >
              Delete
            </Button>}
            
            <Button 
              type="submit" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {selectedItem ? 'Update' : 'Add Item'}
            </Button>
            
            <Button
              type="reset"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Close
            </Button>
          </div>
        </form>
      </Modal>

       <SweetAlert
          isOpen={showAlert}
          onClose={() => setShowAlert(false)}
          onConfirm={handleDelete}     // ← Action on confirm
          onCancel={() => setShowAlert(false)}       // ← Action on cancel
          type="error"
          title="Delete Item?"
          message="This action cannot be undone."
          confirmText="Yes, Delete"
          showCancelButton={true}
          showCloseButton={false}
        />

      {toast.ToastComponent}
    </div>
  );
}

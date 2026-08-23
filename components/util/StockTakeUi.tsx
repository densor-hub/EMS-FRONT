"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Calendar,
  Clock,
  Package,
  MapPin,
  Hash,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { format } from 'date-fns';
import axiosInstance from "@/lib/customAxios";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import Loading from "@/app/dashboard/loading";
import { DataTable } from '@/components/dashboard/data-table';

// Types
interface StockLockDownItem {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  isEscalated: boolean;
  unitOfMeasure : string;
  quantityPerUnitOfMeasure: number;
  submissions: Array<{
    id: string;
    systemAvailableQuantity: number;
    totalInPieces: number;
    physicalUnitOfMeasureQuantity: number;
    physicalAdditionalPiecesQuantity: number;
    totalVariance: number;
    status: string;
  }>;
}

interface StockLockDown {
  id: string;
  locationId: string;
  locationName: string;
  transactionNumber: string;
  transactionDate: string;
  turnAroundTime: string;
  systemCreationDate: string;
  items?: StockLockDownItem[];
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

interface SubmissionFormData {
  stockLockDownItemId: string;
  physicalUnitOfMeasureQuantity: number;
  physicalAdditionalPiecesQuantity: number;
  remarks: string;
}

export default function StockTakeUI() {
  const { toast } = useToast();
  const { user, selectedShop } = useAuth();
  
  // State
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [stockLockDowns, setStockLockDowns] = useState<StockLockDown[]>([]);
  const [filteredData, setFilteredData] = useState<StockLockDown[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<StockLockDown | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  // Submission states
  const [submissionData, setSubmissionData] = useState<Record<string, { packs: string; pieces: string }>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to format numbers with commas
  const formatNumber = useCallback((value: number | string | undefined): string => {
    if (value === undefined || value === null || value === '') return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US');
  }, []);

  // Get selected shop from session if not in context
  const getSelectedShop = useCallback(() => {
    if (selectedShop) return selectedShop;
    return sessionStorage.getItem("selectedShop") || "";
  }, [selectedShop]);

  // Helper to get item by ID
  const getItemById = useCallback((itemId: string) => {
    return selectedRecord?.items?.find(x => x.id === itemId);
  }, [selectedRecord]);

  // Get the most recent submission status
  const getRecentSubmissionStatus = useCallback((item: StockLockDownItem) => {
    if (!item.submissions || item.submissions.length === 0) return null;
    // Assuming submissions are in chronological order (oldest to newest)
    const recentSubmission = item.submissions[item.submissions.length - 1];
    return recentSubmission.status;
  }, []);

  // Check if item is locked (Approved or Pending status)
  const isItemLocked = useCallback((item: StockLockDownItem) => {
    if (!item.submissions) return false;
    return item.submissions.some(sub => 
      sub.status === 'Approved' || sub.status === 'Pending'
    );
  }, []);

  // Fetch stock lockdown data
  const fetchStockLockDowns = useCallback(async () => {
    const locationId = getSelectedShop();
    
    if (!locationId) {
      toast.error({
        title: 'No shop selected',
        description: 'Please select a shop to view stock lockdowns',
      });
      return;
    }

    setIsApplyingFilters(true);
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('LocationId', locationId);
      
      const start = startDate ;
      const end = endDate;
      
      params.append('StartDate', start);
      params.append('EndDate', end);

      const response = await axiosInstance.get(`/StockLockDown?${params.toString()}`);
      
      if (response?.data) {
        const data = Array.isArray(response.data) ? response.data : [response.data];
        setStockLockDowns(data);
        setFilteredData(data);
        setPagination(prev => ({
          ...prev,
          totalItems: data.length,
          currentPage: 1
        }));
      }
    } catch (error: any) {
      console.error("Error fetching stock lockdowns:", error);
      toast.error({
        title: 'Failed to load data',
        description: typeof(error?.response?.data) === "string" ? error?.response?.data :  error?.response?.data?.message || 'Please try again later',
      });
      setStockLockDowns([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
      setIsApplyingFilters(false);
    }
  }, [getSelectedShop, startDate, endDate, toast]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    // Reset to today's date and refetch
    // Fetch after clearing
    setTimeout(() => {
      fetchStockLockDowns();
    }, 100);
  }, [fetchStockLockDowns]);

  // Fetch detailed stock lockdown by ID
  const fetchStockLockDownDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const response = await axiosInstance.get(`/StockLockDown/${id}`);
      
      if (response?.data) {
        setSelectedRecord(response.data);
        setExpandedItems(new Set()); // Reset expanded items when opening new modal
        setSubmissionData({}); // Reset submission data
        setIsModalOpen(true);
      }
    } catch (error: any) {
      console.error("Error fetching stock lockdown detail:", error);
      toast.error({
        title: 'Failed to load details',
        description: typeof(error?.response?.data) === "string" ? error?.response?.data :  error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setLoadingDetail(false);
    }
  }, [toast]);

  // Toggle item expansion
  const toggleItemExpansion = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Handle submission input changes
  const handleSubmissionInputChange = useCallback((itemId: string, field: 'packs' | 'pieces', value: string) => {
    setSubmissionData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  }, []);

  // Check if submit button should be enabled for a row
  const isSubmitEnabled = useCallback((itemId: string) => {
    const data = submissionData[itemId];
    if (!data) return false;
    const packs = parseInt(data.packs);
    const pieces = parseInt(data.pieces);
    return (!isNaN(packs) && packs > 0) || (!isNaN(pieces) && pieces > 0);
  }, [submissionData]);

  // Handle submit button click
  const handleSubmitClick = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setRemarks("");
    setShowConfirmModal(true);
  }, []);

  // Handle confirm submission
  const handleConfirmSubmission = useCallback(async () => {
    if (!selectedItemId || !selectedRecord) return;

    const data = submissionData[selectedItemId];
    if (!data) return;

    const packs = parseInt(data.packs) || 0;
    const pieces = parseInt(data.pieces) || 0;

    if (packs === 0 && pieces === 0) {
      toast.error({
        title: 'Invalid input',
        description: 'Please enter at least one value (packs or pieces)',
      });
      return;
    }

    const payload: SubmissionFormData = {
      stockLockDownItemId: selectedItemId,
      physicalUnitOfMeasureQuantity: packs,
      physicalAdditionalPiecesQuantity: pieces,
      remarks: remarks.trim() || "No remarks provided"
    };

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post('/StockLockDown/Submit-Stock', payload);
      
      if (response?.status === 200  || response?.status === 201) {
        toast.success({
          title: 'Submission successful',
          description: 'Your stock submission has been sent for review',
        });
        // Close confirm modal
        setShowConfirmModal(false);
        // Reset submission data for this item
        setSubmissionData(prev => {
          const newData = { ...prev };
          delete newData[selectedItemId];
          return newData;
        });
        // Refresh the detail data
        if (selectedRecord) {
          await fetchStockLockDownDetail(selectedRecord.id);
        }
      }
    } catch (error: any) {
      console.error("Error submitting stock:", error);
      toast.error({
        title: 'Submission failed',
        description: typeof(error?.response?.data) === "string" ? error?.response?.data :  error?.response?.data?.message || 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItemId, selectedRecord, submissionData, remarks, toast, fetchStockLockDownDetail]);

  // Handle cancel submission
  const handleCancelSubmission = useCallback(() => {
    setShowConfirmModal(false);
    setSelectedItemId(null);
    setRemarks("");
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredData(stockLockDowns);
      setPagination(prev => ({
        ...prev,
        totalItems: stockLockDowns.length,
        currentPage: 1
      }));
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = stockLockDowns.filter(item => 
      item.transactionNumber?.toLowerCase().includes(searchLower) ||
      item.locationName?.toLowerCase().includes(searchLower) ||
      item.id?.toLowerCase().includes(searchLower)
    );
    
    setFilteredData(filtered);
    setPagination(prev => ({
      ...prev,
      totalItems: filtered.length,
      currentPage: 1
    }));
  }, [searchTerm, stockLockDowns]);

  // Handle date filter
  const handleDateFilter = useCallback(() => {
    fetchStockLockDowns();
  }, [fetchStockLockDowns]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: Math.max(1, Math.min(page, Math.ceil(prev.totalItems / prev.itemsPerPage)))
    }));
  }, []);

  const handleItemsPerPageChange = useCallback((value: string) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: parseInt(value),
      currentPage: 1
    }));
  }, []);

  // Get current page data
  const currentPageData = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, pagination.currentPage, pagination.itemsPerPage]);

  // Total pages
  const totalPages = useMemo(() => {
    return Math.ceil(pagination.totalItems / pagination.itemsPerPage);
  }, [pagination.totalItems, pagination.itemsPerPage]);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  // Format date only
  const formatDateOnly = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any }> = {
      'Completed': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> },
      'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4" /> },
      'Failed': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3 sm:w-4 sm:h-4" /> },
      'In Progress': { color: 'bg-blue-100 text-blue-800', icon: <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> },
      'Approved': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> },
      'Rejected': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3 sm:w-4 sm:h-4" /> },
    };
    
    const defaultStatus = { color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" /> };
    const statusInfo = statusMap[status] || defaultStatus;
    
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.icon}
        {status}
      </span>
    );
  };

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      key: 'transactionNumber',
      label: 'Transaction #',
      sortable: true,
      render: (item: StockLockDown) => (
        <span className="font-medium">{item.transactionNumber || 'N/A'}</span>
      )
    },
    {
      key: 'locationName',
      label: 'Location',
      sortable: true,
      render: (item: StockLockDown) => (
        <span>{item.locationName || 'N/A'}</span>
      )
    },
    {
      key: 'transactionDate',
      label: 'Transaction Date',
      sortable: true,
      render: (item: StockLockDown) => formatDateOnly(item.transactionDate)
    },
    {
      key: 'turnAroundTime',
      label: 'Turn Around Time',
      sortable: true,
      render: (item: StockLockDown) => formatDate(item.turnAroundTime)
    },
    {
      key: 'systemCreationDate',
      label: 'Created',
      sortable: true,
      render: (item: StockLockDown) => formatDate(item.systemCreationDate)
    }
  ], [formatDate, formatDateOnly]);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchStockLockDowns();
  }, [fetchStockLockDowns]);

  // Auto-search when search term changes
  useEffect(() => {
    handleSearch();
  }, [searchTerm, handleSearch]);

  // Check if shop is selected
  const sessionShop = sessionStorage.getItem("selectedShop");
  if (!selectedShop && !sessionShop) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Shop Selected</h3>
            <p className="text-muted-foreground mb-4">Please select a shop to view stock lockdowns</p>
            <Button onClick={() => window.location.href = '/dashboard/select-shop'}>
              Select Shop
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white/80 to-gray-100/80 backdrop-blur-md p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Search and Filter Section */}
        <Card>
          <CardContent className="">
            <div className="flex flex-col md:flex-row items-end gap-4">
              {/* Search Bar */}
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search" className="text-sm font-medium mb-1.5 block text-left" >
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by transaction #, location, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 border-2 border-grey-300"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div className="min-w-[150px]">
                <Label htmlFor="startDate" className="text-sm font-medium mb-1.5 block  text-left">
                  Start Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 border-2 border-grey-300"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="min-w-[150px]">
                <Label htmlFor="endDate" className="text-sm font-medium mb-1.5 block  text-left">
                  End Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 border-2 border-grey-300"
                  />
                </div>
              </div>

              {/* Apply Filters Button */}
              <Button 
                onClick={handleDateFilter}
                className="shrink-0 mb-[2px]"
                disabled={isApplyingFilters}
              >
                {isApplyingFilters ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Search'
                )}
              </Button>

              {/* Clear Filters Button */}
              <Button 
                onClick={clearFilters}
                variant="outline"
                className="shrink-0 mb-[2px]"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Table - Using DataTable */}
        <DataTable
          title="Stock Lockdown Records"
          data={filteredData}
          columns={columns}
          searchKey="transactionNumber"
          addLabel="Refresh"
          emptyMessage="No stock lockdown records found for the selected shop."
          onRowClick={(row: any) => fetchStockLockDownDetail(row.id)}
          onAdd={fetchStockLockDowns}
          pageSize={pagination.itemsPerPage}
        />
      </div>

      {/* Detail Modal - Mobile Responsive */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-3 sm:p-6 md:p-6"
          style={{ maxWidth: '1000px', width: '95vw' }}
        >
          <DialogHeader className="border-b pb-2 sm:pb-4">
            <DialogTitle className="text-base sm:text-xl md:text-2xl font-bold flex flex-wrap items-center gap-1 sm:gap-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
              <span className="text-sm sm:text-base md:text-2xl">Stock Lockdown Details</span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1 ml-0 sm:ml-2">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Transaction #</Label>
                <Label className="font-semibold text-xs sm:text-sm">{selectedRecord?.transactionNumber || 'N/A'}</Label>
              </div>
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedRecord ? (
            <div className="space-y-3 sm:space-y-6 h-[calc(95vh-80px)] overflow-y-auto">
              {/* Header Information - Mobile Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-muted/30 rounded-lg">
                <div className="min-w-0">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Location</Label>
                  <p className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm truncate">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{selectedRecord.locationName || 'N/A'}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Transaction Date</Label>
                  <p className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm truncate">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{formatDate(selectedRecord.systemCreationDate)}</span>
                  </p>
                </div>
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Turn Around Time</Label>
                  <p className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm truncate">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{formatDate(selectedRecord.turnAroundTime)}</span>
                  </p>
                </div>
              </div>

              {/* Items Section - Table with horizontal scroll on mobile */}
              <div>
                {selectedRecord.items && selectedRecord.items.length > 0 ? (
                  <>
                    <div className="mb-2 sm:mb-4 text-xs sm:text-sm text-muted-foreground">
                      Enter either packs, pieces, or both if applicable, then submit per item.
                      {selectedRecord.items.some(item => isItemLocked(item)) && (
                        <span className="ml-1 sm:ml-2 text-amber-600">
                          (Locked items cannot be edited)
                        </span>
                      )}
                    </div>
                    <div className="border rounded-lg overflow-x-auto overflow-y-visible">
                      <div className="min-w-[640px] sm:min-w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-8 sm:w-10"></TableHead>
                              <TableHead className="text-xs sm:text-sm">Item Name</TableHead>
                              <TableHead className="text-center text-xs sm:text-sm"># of Packs</TableHead>
                              <TableHead className="text-center text-xs sm:text-sm"># Pieces</TableHead>
                              <TableHead className="text-xs sm:text-sm">Status</TableHead>
                              <TableHead className="text-xs sm:text-sm">Item Code</TableHead>
                              <TableHead className="text-center text-xs sm:text-sm">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedRecord.items.map((item) => {
                              const isExpanded = expandedItems.has(item.id);
                              const submitEnabled = isSubmitEnabled(item.id);
                              const inputData = submissionData[item.id] || { packs: '', pieces: '' };
                              const isLocked = isItemLocked(item);
                              const recentStatus = getRecentSubmissionStatus(item);

                              return (
                                <React.Fragment key={item.id}>
                                  <TableRow 
                                    className={`hover:bg-muted/30 transition-colors ${isLocked ? 'bg-amber-50/50' : ''}`}
                                  >
                                    <TableCell>
                                      {item.submissions && item.submissions.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                                          onClick={() => toggleItemExpansion(item.id)}
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                          ) : (
                                            <ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                          )}
                                        </Button>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs sm:text-sm max-w-[80px] sm:max-w-none truncate">
                                      {item.itemName || 'Unknown Item'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        value={inputData.packs ?? ''}
                                        onChange={(e) => handleSubmissionInputChange(item.id, 'packs', e.target.value)}
                                        className={`w-16 sm:w-24 mx-auto text-center text-xs sm:text-sm h-7 sm:h-10 ${isLocked ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''}`}
                                        onClick={(e) => e.stopPropagation()}
                                        readOnly={isLocked}
                                        disabled={isLocked}
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        value={inputData.pieces ?? ''}
                                        onChange={(e) => handleSubmissionInputChange(item.id, 'pieces', e.target.value)}
                                        className={`w-16 sm:w-24 mx-auto text-center text-xs sm:text-sm h-7 sm:h-10 ${isLocked ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''}`}
                                        onClick={(e) => e.stopPropagation()}
                                        readOnly={isLocked}
                                        disabled={isLocked}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {recentStatus ? (
                                        getStatusBadge(recentStatus)
                                      ) : item.isEscalated ? (
                                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] sm:text-xs">
                                          <AlertCircle className="w-2 h-2 sm:w-3 sm:h-3" />
                                          Escalated
                                        </span>
                                      ) : (
                                        <span className="text-[10px] sm:text-xs text-muted-foreground">No Submissions</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <span className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm">
                                        <Hash className="w-3 h-3 text-muted-foreground" />
                                        {item.itemCode || 'N/A'}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        size="sm"
                                        className="h-7 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm"
                                        disabled={!submitEnabled || isSubmitting || isLocked}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSubmitClick(item.id);
                                        }}
                                        variant={isLocked ? "outline" : "default"}
                                      >
                                        {isSubmitting && selectedItemId === item.id ? (
                                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                        ) : isLocked ? (
                                          'Locked'
                                        ) : (
                                          'Submit'
                                        )}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                  
                                  {/* Expanded Submissions Row */}
                                  {isExpanded && item.submissions && item.submissions.length > 0 && (
                                    <TableRow>
                                      <TableCell colSpan={7} className="p-2 sm:p-4 bg-muted/10">
                                        <div className="space-y-2 sm:space-y-3">
                                          {item.submissions.map((submission, subIndex) => {
                                            const currentItem = getItemById(item.id);
                                            return (
                                              <Card key={submission.id || subIndex} className="bg-white">
                                                <CardContent className="p-2 sm:p-4">
                                                  <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                                                    <div className="text-xs sm:text-sm">
                                                      <span className="font-medium">Submission #{subIndex + 1} - </span>
                                                      <span className="text-muted-foreground">System Available:</span>
                                                      <span className="font-medium">{formatNumber(submission.systemAvailableQuantity)}</span>
                                                    </div>
                                                    {getStatusBadge(submission.status)}
                                                  </div>
                                                  <div className="gap-1 sm:gap-2 text-xs sm:text-sm flex flex-wrap mt-1 sm:mt-2">
                                                    <div>
                                                      <span className="text-muted-foreground">Total {currentItem?.unitOfMeasure || 'UOM'}:</span>
                                                      <span className="font-medium">{formatNumber(submission.physicalUnitOfMeasureQuantity)}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-muted-foreground"><i>Qty/{currentItem?.unitOfMeasure || 'UOM'}:</i></span>
                                                      <span className="font-medium">{formatNumber(currentItem?.quantityPerUnitOfMeasure || 0)}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-muted-foreground">Add. Pieces:</span>
                                                      <span className="font-medium">{formatNumber(submission.physicalAdditionalPiecesQuantity)}</span>
                                                    </div>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm mt-1 sm:mt-2">
                                                    <div>
                                                      <span className="text-muted-foreground">Total Pieces:</span>
                                                      <span className="font-medium">{formatNumber(submission.totalInPieces)}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-muted-foreground">Variance:</span>
                                                      <span className={`font-medium ${submission.totalVariance > 0 ? 'text-green-600' : submission.totalVariance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                        {formatNumber(submission.totalVariance)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </CardContent>
                                              </Card>
                                            );
                                          })}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No items found for this lockdown</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirm Submission</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Are you sure you want to submit? The information will be submitted for review.
            </DialogDescription>
          </DialogHeader>

          {selectedItemId && submissionData[selectedItemId] && (
            <div className="mt-4 p-3 bg-muted/30 rounded-md">
              <p className="text-sm font-medium">Summary:</p>
              {(() => {
                const item = getItemById(selectedItemId);
                const packs = parseInt(submissionData[selectedItemId].packs) || 0;
                const pieces = parseInt(submissionData[selectedItemId].pieces) || 0;
                const quantityPerUnit = item?.quantityPerUnitOfMeasure || 0;
                const totalInPieces = (quantityPerUnit * packs) + pieces;
                
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm mb-5">
                      <div>
                        <span className="text-muted-foreground text-xs sm:text-sm"># of {item?.unitOfMeasure || 'Packs'}:</span>
                        <p className="font-medium text-sm sm:text-base">{formatNumber(packs)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs sm:text-sm">Qty/{item?.unitOfMeasure || 'Pack'}:</span>
                        <p className="font-medium text-sm sm:text-base">{formatNumber(quantityPerUnit)}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground text-xs sm:text-sm">Add. Pieces:</span>
                        <p className="font-medium text-sm sm:text-base">{formatNumber(pieces)}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs sm:text-sm">Total Pieces:</span>
                      <span className="font-medium text-sm sm:text-base">{formatNumber(totalInPieces)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          
          <div className="py-4">
            <Label htmlFor="remarks" className="text-sm font-medium mb-2 block">
              Remarks
            </Label>
            <textarea
              id="remarks"
              className="w-full min-h-[80px] sm:min-h-[100px] p-3 border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Enter your remarks here..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancelSubmission}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmission}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Proceed'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
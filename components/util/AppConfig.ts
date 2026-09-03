import { IdAndName } from "@/lib/types";
interface AppConfiguration {
    qrCodePrinterSize?: number,
    barCodePrinterSize?: number,
    receiptPrinterSize?: number,
    currency?: string 
    pampaymentMethods? : IdAndName[],
    categories : IdAndName[] ,
    unitOfMeasurements : IdAndName[],
    transactionTypes : IdAndName[]  
}



export const paymentMethods: IdAndName[] = [
  { name: "Mobile Money", id: 1 },
  { name: "Cash", id: 2 },
  { name: "Cheque", id: 3 },
  { name: "Bank Transfer", id: 4 },
  { name: "Other", id: 5 }
];

export const CATEGORIES : IdAndName[] = [{name: 'Academics' , id : "1"}, {name: 'Edible' , id : "2"}, //{name: 'Tech' , id : "3"},
   {name: 'Apparel' , id : "4"}, {name: 'Product' , id : "5"}, {name: 'Tool' , id : "6"},
   {name: 'Device' , id : "7"},{name: 'Other' , id : "8"}];

export const UNITS : IdAndName[] = [{name: 'Piece' , id : "1"}, {name: 'Box' , id : "2"}, {name: 'Set' , id : "3"},
   {name: 'Pack' , id : "4"}, {name: 'Liter' , id : "5"}, {name: 'Yard' , id : "6"},
   {name: 'Meters' , id : "7"},{name: 'Feet' , id : "8"}, {name:"Tonnage", id:"9"}, {name:"Bag", id:"10"}];

   export const transactionTypes : IdAndName []= [
     {id : "1", name : "SALE"},  //sale
     {id : "2", name : "PURC"} ,
     {id : "3", name : "STOC"} ,
     {id : "4", name : "TRAN"} ,
     {id : "5", name : "DEPO"} ,
     {id : "6", name : "SLP"} ,
     {id : "7", name : "MISC"} ,
     {id : "8", name : "SREV"} ,
     {id : "9", name : "PREV"} ,
     {id : "10", name : "GIT"} ,
        // PURC =2, //purchase
        // STOC=3, //stock lock
        // TRAN=4, // stock transfer
        // DEPO=5, // financial deposit
        // SLP=6, //salary payment
        // MISC=7, //miscellaneous
        // SREV=8, //sale reversal
        // PREV=9, //purchase reversal
        // GIFT=10 // giftin
   ]

export const config : AppConfiguration = {
    qrCodePrinterSize : 57,
    barCodePrinterSize : 57,
    receiptPrinterSize: 57,
    currency : "GHS",
    pampaymentMethods: paymentMethods,
    unitOfMeasurements: UNITS,
    categories: CATEGORIES,
    transactionTypes: transactionTypes
}


import { useState, useEffect, useRef, SetStateAction, Dispatch } from "react";
import { formatNumberWithCommas, alphaNumericDate } from "@/helpers/formatStrings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from "lucide-react";
import { config } from "@/components/util/AppConfig";

const paymentMethods  =  [
  {name :"Mobile Money" , id : 1}, 
  {name :"Cash", id :2}, 
  {name :"Cheque" , id : 3}, 
  {name :"Bank Transfer " , id : 4},
  // {name :"Other" , id : 5} 
]

interface AddPaymentProps {
  amountPaid : string,
  setAmountPaid : Dispatch<SetStateAction<string>>, 
  date: string,
  setDate :  Dispatch<SetStateAction<string>>, 
  paymentMethod : string,
  setPaymentMethod : Dispatch<SetStateAction<string>>
  minDate:string
}

const AddPayment = ({ amountPaid, setAmountPaid, date, setDate, paymentMethod, setPaymentMethod, minDate}: AddPaymentProps) => {
  const dateRef = useRef<HTMLInputElement>(null)
  
  return <div className="md:flex space-between space-x-2">
      {/* Amount Paid Input */}
                  <div className="space-y-2 md:w=[58%]">
                    <Label htmlFor="quantity" className="text-foreground">Amount Paid {`(${config.currency})`}<span className="text-destructive">*</span></Label> 
                    <Input
                      id="quantity"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(formatNumberWithCommas(e.target.value))}
                      className="bg-white border-border"
                      style={{textAlign:"right"}}
                    />
                  </div>

            <div className="space-y-2 md:col-span-2" style={{minWidth:"150px"}}>
                  <Label htmlFor="item" className="text-foreground">Payment Method  <span className="text-destructive">*</span></Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="bg-white border-border w-[100%]">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            {/* <span className="text-xs text-muted-foreground">{item.name}</span> */}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                  <div className="space-y-2 md:w=[58%]" style={{height:"60px"}}>
                    <Label htmlFor="hireDate" className="text-foreground">Date  <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      {/* <Calendar className="absolute left-3 top-[20px] -translate-y-1/2 w-4 h-4 text-muted-foreground" /> */}
                       <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="pl-7 sm:pl-10 bg-white border-border text-xs sm:text-sm"
                        max={new Date().toISOString().split('T')[0]}
                        min={minDate}
                    />
                  </div>
                </div>

  </div>
}


export default AddPayment
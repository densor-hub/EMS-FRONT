import { CartItem, TransactionItem} from "@/lib/types"

export const symbol_inString = (value : string) => {
    const containsSymbol = /[!@#$%^&(),.?":{}|<>/_|+`~";]/
   return containsSymbol.test(value)
}

export const symbol_inNumber = (value: string) => {
    const containsSymbol = /[!@#$%^&()*?":{}|<>/_|+`~";]/
    return containsSymbol.test(value)
}

export const hasAlphabetInNumber = (value: string) => {
    const containsAlphabet = /[a-zA-Z]/
    return containsAlphabet.test(value)
}

export const removeAllAlphabets = (str: string) => {
  return str?.toString().replace(/[a-zA-Z]/g, '') || ''
}

export const capitalize = (data: string) => {
    if (!data || data?.toString().trim()?.length === 0) return
        let finalString = ""
        data?.toString()?.trim()?.split(" ").forEach(element => {
          if (element?.length > 0) {
            finalString += `${ element[0]?.toUpperCase()}${element?.slice(1)?.toLowerCase()} `
          }
          
        })
        return finalString?.trim() 
    }

export const time = (date: string)  => {
    return date?.toString()?.trim() === undefined || date?.toString()?.trim()?.length === 0 ?  date : `${new Date(date)?.toString()?.slice(16, 25)} ${Number(new Date(date)?.toString()?.slice(16, 18)) > 11 ? "pm" : "am"}`
}

export const alphaNumericDate = (date: string) => {
   const alphaNumericDate = new Date(date?.toString()?.trim())?.toString()?.slice(4, 16)
   return date?.toString()?.trim() === undefined || date?.toString()?.trim()?.length === 0 ?  "" : `${alphaNumericDate?.slice(4, 6)}-${alphaNumericDate?.slice(0, 3)}-${alphaNumericDate?.slice(7)}`
}

export const alphaNumericCurrentDate = () => {
    return alphaNumericDate(`${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getFullYear()}`)
}

export const currentDate = () => {
    return alphaNumericDate(`${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getFullYear()}`)
}

export const numericCurrentDate = (format: string) => {
  const year = new Date().getFullYear()
  const month = new Date().getMonth() + 1
  const day = new Date().getDate()
    let dateValue = ''
    format?.toString().toLowerCase().trim() === 'yyyy-mm-dd' ? (
      dateValue = `${year}-${month?.toString().length < 2 ? `0${month}` : month}-${day?.toString().length < 2 ? `0${day}` : day}`
    ) :   format?.toString().toLowerCase().trim() === 'mm-dd-yyy' ? (
      dateValue = `${month?.toString().length < 2 ? `0${month}` : month}-${day?.toString().length < 2 ? `0${day}` : day}-${year}`
    ) : dateValue = `${day?.toString().length < 2 ? `0${day}` : day}-${month?.toString().length < 2 ? `0${month}` : month}-${year}` 

    return dateValue
}

export const formatNumberWithCommas = (number: string) => {
    if (!number || number === null || number === undefined) return ""
    if (symbol_inNumber(number?.toString())) return ""
    const retriveNumber = removeAllAlphabets.toString()?.replace(/,/g, '') ? removeAllAlphabets(number?.toString()).toString()?.replace(/,/g, '') : number

    
    if (retriveNumber?.toString().includes(".")) {
      return `${retriveNumber?.toString()?.split(".")[0]?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${retriveNumber?.toString()?.slice(retriveNumber?.toString()?.split(".")[0]?.length).replace(/\./g, '')}`
    }

    return retriveNumber?.toString()?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
}

export const currency = (value: string) => {
    if (value === undefined) return ""
    let decimalPoints = value?.toString()?.includes(".") ?  `${value?.toString()?.slice(value?.toString()?.split(".")[0]?.length).replace(/\./g, '')}` : parseFloat(value?.toString()?.trim()).toFixed(2).split(".")[1]
    if (decimalPoints?.length ===  1) {
      decimalPoints = `0${decimalPoints}`
    }
    return formatNumberWithCommas((value))?.length > 0 ? `${formatNumberWithCommas((value?.toString()?.split(".")[0]))}.${decimalPoints}` : ""
}

export const removeCommasFromNumbers = (string: string) => {
  // console.log(string)
  if (symbol_inNumber(string)) return ""
  if (string === undefined || string === null) return 0

  return Number(string?.toString()?.replace(/,/g, '')) 
}

export const volume = (value: string) => {
  if ((Number(value) === 0 || value?.toString().trim() === "0")) {
      return Number(value)
  }
    return formatNumberWithCommas((removeCommasFromNumbers(value))?.toString())
 }


export const removeHyphinFromCarNumber = (string : string) => {
    if (string === undefined) return ""
 
    return string?.toString()?.replace(/-/g, '')
}

export const carNumber = (string : string) => {
    if (string === undefined || string === null) return ""
    if (string?.includes("-")) { return string?.toUpperCase() }
    if (string.length > 10) return string
    string = removeHyphinFromCarNumber(string)
    if (string?.length === 0 || string === null || string === undefined) return ""
    if (isNaN(Number(string[string.length - 1]))) return `${string?.slice(0, 2)}-${string?.slice(2, string.length - 1)}-${string.slice(string.length - 1)}`
    return `${string?.slice(0, 2)}-${string?.slice(2, string.length - 2)}-${string.slice(string.length - 2)}`
}


export const separateByCapitalLetters = (string: string) => {
    return String(string).replace(/([A-Z])/g, ' $1').trim()
}


export const urlParams = () => {
    const urlParams = {}
    window?.location?.search?.slice(1)?.split('&').forEach(param => {
      urlParams[param?.split("=")[0]?.toString()] = param?.split("=")[1]?.toString()?.replace(/%20/g, ' ')
    })

    return urlParams
}

export const Sum = (propOfArrayItemToBeSumed = "", array = []) => {
    let total = 0
    array?.forEach(element => {
            total += Number(removeCommasFromNumbers(element[propOfArrayItemToBeSumed]))
    })
    return total
}



  export const isNotValidSearchInput = (value = "", allowEmptyValue = false) => {
    const filter = value?.trim()
    if (!value?.trim() && !allowEmptyValue) {
       return  ("Please enter a filter in the search box")
    } 
    
    if (!/[a-zA-Z0-9]/.test(filter) && filter !== "*") {
       return  ("Please enter valid search text")
    } 
    
  }

  export const toastErrors = (toast : any, error: any, heading: string = "", showHeading : boolean = false) => {
    console.log(error)
   return   toast.warning({
        title: heading || (showHeading ?  'Failed to submit' : ""),
        description: typeof(error) === 'string' ? error : error?.response?.data?.message 
          ? error?.response?.data?.message 
          : typeof(error?.response?.data) === 'string' 
            ? error?.response?.data 
            : 'Please try again later'
      })
  }

  export const toastSuccess = (toast : any, successMessgae: any, heading: string = "") => {
     toast.success({
        title: heading ,
        description: successMessgae
      })
  }

  // Helper function to get the total delivered quantity for an item
  export const getDeliveredQuantity = (item: TransactionItem, isStockTransfer: boolean, suppplierId : string): number => {
    if (!item.itemsDelivered) return 0;
    if (isStockTransfer) {
       if (suppplierId !== (sessionStorage.getItem("selectedShop"))) {
           return item.itemsReceived.reduce((sum, delivery) => sum + delivery.quantity, 0);
       }
    }
    return item.itemsDelivered.reduce((sum, delivery) => sum + delivery.quantity, 0);
  };
  

  // Helper function to get the remaining quantity for an item
// This does NOT factor in cart selections
export const getOriginalRemainingQuantity = (item: TransactionItem, isStockTransfer: boolean,  suppplierId : string): number => {
  const delivered = getDeliveredQuantity(item, isStockTransfer, suppplierId);
  return (item.quantity || 0) - delivered;
};


  // Get the current cart quantity for a specific item
  const getCartQuantity = (itemId: string, cart: CartItem[]): number => {
    const cartItem = cart.find(c => c.id === itemId);
    return cartItem ? cartItem.receivingQuantity : 0;
  };

  // Get the remaining quantity factoring in cart selections
  export const getRemainingQuantity = (item: TransactionItem, isStockTransfer : boolean, supplierId: string , cart : CartItem[] ): number => {
    const originalRemaining = getOriginalRemainingQuantity(item, isStockTransfer, supplierId);
    const cartQty = getCartQuantity(item.id || item.itemId, cart);
    return originalRemaining - cartQty;
  };

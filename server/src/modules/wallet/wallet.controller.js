export class WalletController{
  constructor({walletService}){
    this.walletService=walletService;
  }

  summary=async(req,res)=>{
    const result=await this.walletService.summary(req.user.id);
    res.status(200).json(result);
  };

  startTopUp=async(req,res)=>{
    const result=await this.walletService.startTopUp(req.body,req.user);
    res.status(201).json(result);
  };

  confirmTopUp=async(req,res)=>{
    const result=await this.walletService.confirmTopUp(req.params.topUpId,req.body,req.user);
    res.status(200).json(result);
  };
}

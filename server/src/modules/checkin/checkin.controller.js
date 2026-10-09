export class CheckInController{
  constructor({checkInService}){
    this.checkInService=checkInService;
  }

  redeem=async(req,res)=>{
    const result=await this.checkInService.redeem(req.body);
    res.status(200).json(result);
  };
}

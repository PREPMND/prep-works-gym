export class WaitlistController{
  constructor({waitlistService}){
    this.waitlistService=waitlistService;
  }

  join=async(req,res)=>{
    const result=await this.waitlistService.join(req.body,req.user);
    res.status(201).json(result);
  };

  leave=async(req,res)=>{
    const result=await this.waitlistService.leave(req.params.sessionId,req.user);
    res.status(200).json(result);
  };
}

export class SessionsController{
  constructor({sessionsService}){
    this.sessionsService=sessionsService;
  }

  create=async(req,res)=>{
    const session=await this.sessionsService.create(req.body,req.user.id);
    res.status(201).json({session});
  };

  list=async(req,res)=>{
    const sessions=await this.sessionsService.list(req.query,req.user);
    res.status(200).json({sessions});
  };

  detail=async(req,res)=>{
    const session=await this.sessionsService.detail(req.params.sessionId);
    res.status(200).json({session});
  };

  attendance=async(req,res)=>{
    const result=await this.sessionsService.attendance(req.params.sessionId);
    res.status(200).json(result);
  };
}

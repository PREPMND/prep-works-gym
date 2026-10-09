export class AuthController{
  constructor({authService}){
    this.authService=authService;
  }

  register=async(req,res)=>{
    const result=await this.authService.register(req.body);
    res.status(201).json(result);
  };

  login=async(req,res)=>{
    const result=await this.authService.login(req.body);
    res.status(200).json(result);
  };

  me=async(req,res)=>{
    const user=await this.authService.profile(req.user.id);
    res.status(200).json({user});
  };
}

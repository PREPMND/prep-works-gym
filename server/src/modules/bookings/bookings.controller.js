export class BookingsController{
  constructor({bookingsService}){
    this.bookingsService=bookingsService;
  }

  create=async(req,res)=>{
    const result=await this.bookingsService.create(req.body,req.user);
    res.status(201).json(result);
  };

  mine=async(req,res)=>{
    const result=await this.bookingsService.listForMember(req.user.id);
    res.status(200).json(result);
  };

  cancel=async(req,res)=>{
    const result=await this.bookingsService.cancel(req.params.bookingId,req.user);
    res.status(200).json(result);
  };
}

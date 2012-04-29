# AjaxFormValidator

A plugin written in JavaScript to handle form submissions and automatically render messages returned in JSON for each input element

## How to use it

###Page

	<script>
	// To avoid $ alias conflict with other lib
	$J = jQuery != null ? jQuery : null;

	// Register page elements
	$J(function ($) {
		AjaxFormValidator("/post_to_url",
		{
			form_wrapper: $("#sample_form"),
			form_group: "form_group1",
			success_fun: function (resp) { },
			error_fun: function (resp) { }
		});

	});
	</script>

	<div id="sample_form">
		<div> <input fg="form_group1" name="email" /> </div>
		<div> 
			Agree terms? 
			<input fg="form_group1" type="radio" name="terms" value="yes" />  Yes |
			<input fg="form_group1" type="radio" name="terms" value="no" />  No
		</div>
		<div> <button fg="form_group1" tf="submit">Submit</button> </div>
	</div>

###Server:

####ASP.NET C#:

	// Controller method handle request
	[System.Web.Services.WebMethod]
	public static ValidationDataPackage Test(ValidationDataPackage package)
	{
		var d_email = package.GetItem("email");
		if(String.IsNullOrEmpty(d_email.value))
		{
			d_email.message = "Email can not be empty";
			d_email.status = "error";
		}

		var d_terms = package.GetItem("terms");
		if(d_terms.value == "no")
		{
			d_terms.message = "Sorry, you have to agree.";
			d_terms.status = "error";
		}

		package.status = "error";
		return package;
	}

####MVC.NET C#:

	[HttpPost]
        public ActionResult ActionName(ValidationDataPackage package)
        {
		var d_email = package.GetItem("email");
		if(String.IsNullOrEmpty(d_email.value))
		{
			d_email.message = "Email can not be empty";
			d_email.status = "error";
		}

		var d_terms = package.GetItem("terms");
		if(d_terms.value == "no")
		{
			d_terms.message = "Sorry, you have to agree.";
			d_terms.status = "error";
		}

		package.status = "error";
		JsonResult result = new JsonResult();
		result.Data = package;
		return result;
	}

####Ruby on rails:

	# Controller needs to be configured in route.rb to accept post request

	# Controller method to handle request
	def Test
		respond_to do |format|
			format.html { }

			# For request for json in http headers
			format.json {
				package = params[:package]
				datalist = package[:datalist]

				email = findParam(datalist,"email")
				email[:message] = "Email can not be empty" if email[:value].to_s.strip.length == 0
				email[:status] = "error"

				terms = findParam(datalist,"terms")
				terms[:message] = "Sorry, you have to agree." if terms[:value] == "no"
				terms[:status] = "warning"

				package.status = "error"
				render :json => package
			}
		end
	end

	# Helper method
	def findParam (datalist, id)
		datalist.each do |data|
			if (data['id'] == id)
				return data
			end
		end
		return nil
	end

## Dependencies

This plugin requires jQuery

## Authors

Tianyu Huang

Spinner is written by Felix Gnass http://fgnass.github.com/spin.js/

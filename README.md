# AjaxFormValidator

A plugin written in JavaScript to handle form submissions and automatically render messages returned in JSON for each input element.

## How to use it
###Page
	<style>
	.error_css_class {
		color: red;
		border: solid 1px red;
    	}
	.warning_css_class {
		color: orange;
		border: solid 1px orange;
	}
	.success_css_class {
		color: blue;
		border: solid 1px blue;
	}
	</style>

	<script>
	// To avoid $ alias conflict with other lib
	$J = jQuery != null ? jQuery : null;

	// Register page elements
	$J(function ($) {
		AjaxFormValidator(
		//required: url or method to be called
		"Test",

		//required: parameters send along with post request
		{
			//required: list of form fields in jQuery
			fields:[$('#email'), $('#password')],

			//optional: list of submit buttons in jQuery
			submits:[$('#submit')],

			//optional: the css class for displaying feedback message
			error_css_class: "error_css_class",
			warning_css_class: "warning_css_class",
			success_css_class: "success_css_class",

			//optional: without server side code written, just want to see how it renders the json
			simulate_postback_json:
			{"datalist":
				[
				{"id":"email", "value":"", "message":"Email can not be empty", "status":"error"},
				{"id":"password", "value":"", "message":"Password can not be empty", "status":"warning"}
  				]
			}

		});

	});
	</script>

	<div id="sample_form">
	  <div> <input id="email"  placeholder="email"/> </div>
	  <div> <input id="password" type="password" placeholder="password"/> </div>
	  <div> <input id="submit" type="button" value="Submit"/> </div>
	</div>

###Server:
####ASP.NET:
	// Controller method handle request
	[System.Web.Services.WebMethod]
	public static ValidationDataPackage Test(ValidationDataPackage package)
	{
		var datalist = package.datalist;
		
		//check email
		var d_email = datalist.FirstOrDefault(p => p.id == "email");
		if (d_email != null)
		{
			d_email.message = String.IsNullOrEmpty(d_email.value) ? "Email can not be empty" : "";
			d_email.status = "error";
		}

		//check password
		var d_password = datalist.FirstOrDefault(p => p.id == "password");
		if (d_password != null)
		{
			d_password.message = String.IsNullOrEmpty(d_password.value) ? "Password can not be empty" : "";
			d_password.status = "warning";
		}

		return package;
	}

	// Define model classes
	public class ValidationData
	{
		public string id;
		public string name;
		public string value;
		public string status;
		public string message;
	}
	public class ValidationDataPackage
	{
		public string id;
		public string name;
		public List<ValidationData> datalist;
		public string status;
		public string message;
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

				password = findParam(datalist,"password")
				password[:message] = "Password can not be empty" if password[:value].to_s.strip.length == 0
				password[:status] = "warning"

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

This plugin requires jQuery.

## License

This is dual licensed under the MIT and GPL licenses.

## Authors

Originally developed by Tianyu Huang.

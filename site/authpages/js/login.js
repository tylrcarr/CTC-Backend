//nothing for now
$(document).ready(function(){
	$("#login").on("click", function(){
		console.log("here");
		var user = $("#inputUser").val();
		var pass = $("#inputPass").val();
		$.ajax({
			type: "POST",
			url: window.location.href,
			data: {"user": user, "pass": pass},
			success: function(res) {
				console.log(res);
				window.location.href = res;
			},
			error: function(res) {
				console.log(res);
				switch (res.responseJSON.message) {
					case "credentials":
						$("#login-alert").text("Your username and/or password are wrong.");		
						break;
					case "attempts":
						$("#login-alert").text("You've tried to login too many times.");		
						break;
					case "permissions":
						$("#login-alert").text("Your account doesn't have sufficient permissions to login.");
						break;
					default:
						break;
				};
				$("#login-alert").css("display", "block");
			}
		});
	});
});

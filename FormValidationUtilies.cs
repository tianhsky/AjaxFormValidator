using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Collections;
using System.Text.RegularExpressions;
using System.Runtime.Serialization;

[DataContract]
public class ValidationData
{
	[DataMember]
	public string id { set; get; }
	[DataMember]
	public string name { set; get; }

	private string _value;
	[DataMember]
	public string value
	{
		set
		{
		_	value = value;
		}
		get
		{
			if (!String.IsNullOrEmpty(_value))
			{
				return _value.Trim();
			}
			else
			{
				return _value;
			}
		}
	}
	[DataMember]
	public string status { set; get; }
	[DataMember]
	public string message { set; get; }

}

[DataContract]
public class ValidationDataPackage
{
	[DataMember]
	public string id { set; get; }
	[DataMember]
	public string name { set; get; }
	[DataMember]
	public List<ValidationData> datalist { set; get; }
	[DataMember]
	public string status { set; get; }
	[DataMember]
	public string message { set; get; }

	public ValidationData GetItem(string id)
	{
		ValidationData item = datalist.FirstOrDefault(p => p.id == id);
		return item;
	}
}

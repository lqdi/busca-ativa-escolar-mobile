import {Injectable} from "@angular/core";
import {Child} from "../entities/Child";
import {Observable} from "rxjs";
import {APIService} from "./api.service";
import {AuthHttp} from "angular2-jwt";
import {UtilsService} from "./utils.service";
import {ModalController} from "ionic-angular";
import {EntityPickerModal} from "../pages/modals/entity-picker/entity-picker";

@Injectable()
export class FormBuilderService {

	forms: Object = {};

	constructor(
		public http: AuthHttp,
		public api: APIService,
		public utils: UtilsService,
		public modals: ModalController,
	) {}

	getForm(form: string) : Observable<Form> {
		return this.api
			.get('integration/forms/' + form)
			.map((data) => {
				this.forms[form] = new Form(form, data.form, this.utils, this.modals, this.api);
				return this.forms[form];
			})
	}

}

export class Form {

	tree: Array<any> = null;

	hiddenFieldTypes : Array<string> = [
		'model_field',
		'hidden',
	];

	constructor(
		public formName: string,
		public form : Object,
		public utils: UtilsService,
		public modals: ModalController,
	    public api: APIService,
	) {}

	shouldDisplay(group: string, field: string, data: Object) : boolean {
		let f = this.form[group]['fields'][field];

		if(this.hiddenFieldTypes.indexOf(field) !== -1) return false;

		if(f.options.show_if_true) return (!!data[f.options.show_if_true]) == true;
		if(f.options.show_if_false) return (!!data[f.options.show_if_false]) == false;
		if(f.options.show_if_equal) return (data[f.options.show_if_equal[0]] == f.options.show_if_equal[1]);
		if(f.options.show_if_in) return (f.options.show_if_in[1]).indexOf(data[f.options.show_if_in[0]]) !== -1;
		if(f.options.show_if_not_in) return (f.options.show_if_not_in[1]).indexOf(data[f.options.show_if_not_in[0]]) === -1;
		if(f.options.show_if_same) return data[f.options.show_if_same[0]] == data[f.options.show_if_same[1]];
		
		return true;
	}

	getTree() : any {
		if(!this.tree) {
			this.tree = [];

			for(let i in this.form) {
				if(!this.form.hasOwnProperty(i)) continue;
				this.tree.push(this.form[i]);
			}
		}

		return this.tree;
	}

	getGroupFields(group: any) : Array<any> {
		return this.utils.objectToArray(group.fields);
	}

	getFieldOptions(field: any) {
		return this.utils.objectToArray(field.options.options);
	}

	getFieldLabel(group: string, field: string) : any {
		if(!this.form[group]) return 'err:invalid_group:' + group;
		if(!this.form[group]['fields'][field]) return 'err:invalid_field:' + field;
		return this.form[group]['fields'][field]['label'] || field;
	}

	isMultipleChecked(field: any, option: any, data: any) : boolean {
		if(!data) return false;
		if(!data[field.name]) return false;
		if(!data[field.name].indexOf) return false;

		return (data[field.name].indexOf(option[field.options.key]) !== -1);
	}

	handleModelClick(field:any, data:any) {

		let modal = this.modals.create(EntityPickerModal, {
			title: 'Selecione: ' + field.label,
			items: (query) => {
				let searchParams = {};
				searchParams[field.options.search_by] = query;
				return this.api
					.post(field.options.source, searchParams, true)
					.map((items) => {
						if(!field.options.list_key) return items;
						return items[field.options.list_key];
					})
			},
			render: (item) => {
				return item[field.options.label];
			}
		});

		modal.onDidDismiss((item) => {
			console.log("Selected: ", item, field.name, field.options.key, item[field.options.key]);

			data[field.name] = item[field.options.key];

			if(field.options.key_as) {
				data[field.options.key_as] = item;
			}
		});

		modal.present();

	}

	handleMultipleClick(field: any, option: any, data: any) {
		if(!data) data = {};
		if(!data[field.name]) data[field.name] = [];

		let value = option[field.options.key];
		let index = data[field.name].indexOf(value);

		if(index !== -1) {
			data[field.name].splice(index, 1); // Remove from list
			return;
		}

		data[field.name].push(value); // Add to list

	}

	renderModelValue(field: any, data: any) {
		if(!field.options.key_as || !field.options.label) {
			return data[field.name] || '';
		}

		if(!data[field.options.key_as]) {
			return '';
		}

		return data[field.options.key_as][field.options.label];
	}

}
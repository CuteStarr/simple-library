
const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const Schema = mongoose.Schema;

const AuthorSchema = new Schema({
    first_name: { type: String, required: true, maxLength: 100 },
    //family_name: { type: String, required: true, maxLength: 100 },
    date_of_birth: { type: Date },
    date_of_death: { type: Date }
});

AuthorSchema.virtual('name').get(function () {
    let fullname = '';
    if (this.first_name && this.family_name) {
        fullname = `${family_name}, ${first_name}`;
    }
    if (!this.first_name || !this.family_name) {
        fullname = '';
    }
    return fullname;
});

AuthorSchema.virtual('url').get(function () {
    return `/catalog/author/${this._id}`;
})

/*AuthorSchema.virtual('date_of_birth_formatted').get(function () {
    return this.date_of_birth ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED) : '';
})

AuthorSchema.virtual('date_of_death_formatted').get(function () {
    return this.date_of_death ? DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED) : '';
})*/

AuthorSchema.virtual('lifespan').get(function () {
    let date_of_birth_formatted = this.date_of_birth ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATETIME_MED) : '';
    let date_of_death_formatted = this.date_of_death ? DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATETIME_MED) : '';
    return `${date_of_death_formatted} - ${date_of_birth_formatted}`;
})

module.exports = mongoose.model('Author', AuthorSchema);


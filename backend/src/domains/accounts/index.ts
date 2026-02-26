export {
  createAccount,
  getAccountById,
  updateAccount,
  softDeleteAccount,
  listAccounts,
  validateParentChild,
  AccountError,
  type AccountWithRelations,
} from './account.service';

export { searchAccounts } from './account-search.service';
export { checkDuplicates } from './duplicate.service';
export { createContact, updateContact, softDeleteContact } from './contact.service';
export { accountRoutes } from './account.routes';
